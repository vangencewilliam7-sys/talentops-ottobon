import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { getConversationsByCategory, sendMessage, markAsReadInDB } from '../../../services/messageService';
import { sendNotification } from '../../../services/notificationService';

const messageAudio = new Audio('/sound.mp3');
messageAudio.preload = 'auto';
console.log('[MessageContext] Initialized sound: /sound.mp3');

const MessageContext = createContext();

export const useMessages = () => useContext(MessageContext);

export const MessageProvider = ({ children, addToast }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [conversations, setConversations] = useState([]);
    const [lastReadTimes, setLastReadTimes] = useState({});
    const [userId, setUserId] = useState(null);
    const [notificationQueue, setNotificationQueue] = useState([]);
    const [lastIncomingMessage, setLastIncomingMessage] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    // 1. Auth Change Listener
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUserId(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUserId(null);
                setConversations([]);
                setUnreadCount(0);
                setLastReadTimes({});
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Load initial Read Times from Storage
    useEffect(() => {
        if (!userId) return;
        const storageKey = `message_read_times_${userId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setLastReadTimes(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse read times', e);
            }
        }
    }, [userId]);

    // 3. Request Notification Permissions
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // 4. Fetch Conversations
    const fetchConversations = async () => {
        if (!userId) return [];
        try {
            const { data: memberships } = await supabase
                .from('conversation_members')
                .select('conversation_id')
                .eq('user_id', userId);

            if (!memberships?.length) return [];

            const conversationIds = memberships.map(m => m.conversation_id);

            const { data: convs, error } = await supabase
                .from('conversations')
                .select(`id, type, name, conversation_indexes(last_message, last_message_at)`)
                .in('id', conversationIds);

            if (error) throw error;
            setConversations(convs || []);
            return convs || [];
        } catch (err) {
            console.error('Error fetching conversations:', err);
            return [];
        }
    };

    // 5. Initial fetch & 60s fallback polling
    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 60000);
        return () => clearInterval(interval);
    }, [userId]);

    // 6. Real-time Message Listener
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`messages-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `type=eq.message`
                },
                async (payload) => {
                    // Make sure it's meant for this user
                    if (payload.new.receiver_id !== userId) return;

                    console.log('📬 Real-time message received:', payload);

                    // Play sound IMMEDIATELY — before any async work
                    try {
                        messageAudio.currentTime = 0;
                        messageAudio.play().catch(() => {});
                    } catch (e) {}
                    
                    await fetchConversations();

                    const senderId = payload.new.sender_id;
                    let senderAvatar = null;
                    let conversationId = null;
                    let displayMessage = payload.new.message || 'New Message';

                    // Context Fetching
                    if (senderId) {
                        const [profileRes, membershipsRes] = await Promise.all([
                            supabase.from('profiles').select('avatar_url').eq('id', senderId).single(),
                            supabase.from('conversation_members').select('conversation_id').eq('user_id', senderId)
                        ]);
                        senderAvatar = profileRes.data?.avatar_url;
                        const memberships = membershipsRes.data;

                        if (memberships) {
                            const senderConvIds = memberships.map(c => c.conversation_id);
                            const latestConvs = await fetchConversations();
                            const dm = latestConvs?.find(c => c.type === 'dm' && senderConvIds.includes(c.id));
                            if (dm) {
                                conversationId = dm.id;
                                const lastMessage = dm.conversation_indexes?.[0]?.last_message;
                                if (lastMessage) {
                                    displayMessage = lastMessage;
                                }
                            }
                        }
                    }

                    const newNotification = {
                        id: payload.new.id || Date.now(),
                        sender_id: senderId,
                        sender_name: payload.new.sender_name || 'User',
                        avatar_url: senderAvatar,
                        content: displayMessage,
                        conversation_id: conversationId,
                        timestamp: Date.now()
                    };

                    addNotification(newNotification);
                    setLastIncomingMessage({ 
                        id: payload.new.id, 
                        conversation_id: conversationId,
                        timestamp: Date.now() 
                    });

                    // Optional Legacy Toast
                    if (addToast) {
                        if (conversationId) {
                            const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
                            const myName = myProfile?.full_name || 'Someone';
                            addToast(displayMessage, 'message_reply', {
                                sender: { name: payload.new.sender_name || 'User', avatar_url: senderAvatar },
                                action: {
                                    onReply: async (text) => {
                                        await sendMessage(conversationId, userId, text);
                                        await sendNotification(senderId, userId, myName, text, 'message');
                                    }
                                }
                            });
                        } else {
                            addToast(displayMessage, 'info', { label: 'View', onClick: () => navigate('/messages') });
                        }
                    }

                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, addToast, navigate]); 

    // 7. Calculate Unread Count
    useEffect(() => {
        if (!conversations.length) return;

        let count = 0;
        let hasValidIndexes = false;

        conversations.forEach(conv => {
            const index = conv.conversation_indexes?.[0];
            if (!index?.last_message_at) return;

            hasValidIndexes = true;
            const lastMsgTime = new Date(index.last_message_at).getTime();
            const lastReadTime = lastReadTimes[conv.id] || 0;

            if (lastMsgTime > lastReadTime) count++;
        });

        if (hasValidIndexes) setUnreadCount(count);
    }, [conversations, lastReadTimes]);

    // Actions
    const markAsRead = (conversationId) => {
        const now = Date.now();
        setLastReadTimes(prev => {
            const updated = { ...prev, [conversationId]: now };
            if (userId) localStorage.setItem(`message_read_times_${userId}`, JSON.stringify(updated));
            return updated;
        });

        if (userId && conversationId) {
            markAsReadInDB(conversationId, userId);
        }
    };

    const addNotification = (notification) => {
        setNotificationQueue(prev => [notification, ...prev].slice(0, 5));
    };

    const dismissNotification = (messageId) => {
        setNotificationQueue(prev => prev.filter(n => n.id !== messageId));
    };

    const sendQuickReply = async (conversationId, text) => {
        if (!userId || !conversationId || !text.trim()) return;
        try {
            const { data: conv } = await supabase.from('conversations').select('org_id').eq('id', conversationId).single();
            await sendMessage(conversationId, userId, text.trim(), [], conv?.org_id);
            return true;
        } catch (err) {
            console.error('Quick reply error:', err);
            return false;
        }
    };

    const value = {
        unreadCount,
        conversations,
        markAsRead,
        lastReadTimes,
        notificationQueue,
        dismissNotification,
        addNotification,
        sendQuickReply,
        lastIncomingMessage,
        userId
    };

    return (
        <MessageContext.Provider value={value}>
            {children}
        </MessageContext.Provider>
    );
};
