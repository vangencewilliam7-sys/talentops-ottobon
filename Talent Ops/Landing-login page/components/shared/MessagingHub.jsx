import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, Building2, Search, Paperclip, Send, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
    getConversationsByCategory,
    getConversationMessages,
    sendMessage,
    subscribeToConversation,
    unsubscribeFromConversation,
    getUserDetails,
    getOrgUsers,
    createDMConversation,
    createTeamConversation,
    getOrCreateOrgConversation
} from '../../services/messageService';
import './MessagingHub.css';

const MessagingHub = () => {
    const [activeCategory, setActiveCategory] = useState('myself');
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [currentUserOrgId, setCurrentUserOrgId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewDMModal, setShowNewDMModal] = useState(false);
    const [orgUsers, setOrgUsers] = useState([]);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [authLoading, setAuthLoading] = useState(true);
    const [readConversations, setReadConversations] = useState(new Set());

    // Get current user from Supabase auth
    useEffect(() => {
        const fetchCurrentUser = async () => {
            setAuthLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setCurrentUserId(user.id);

                    // Fetch user profile to get org_id and role
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('org_id, role')
                        .eq('id', user.id)
                        .single();

                    if (!error && profile) {
                        setCurrentUserOrgId(profile.org_id);
                        setCurrentUserRole(profile.role?.toLowerCase());
                        // Always load org users - the function handles null org_id
                        loadOrgUsers(profile.org_id, profile.role?.toLowerCase(), user.id);
                    } else {
                        // Even if no profile, try to load users for executive
                        console.log('No profile found, attempting to load all users');
                        loadOrgUsers(null, 'executive', user.id);
                    }
                }
            } catch (err) {
                console.error('Error fetching current user:', err);
            } finally {
                setAuthLoading(false);
            }
        };

        fetchCurrentUser();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                fetchCurrentUser();
            } else if (event === 'SIGNED_OUT') {
                setCurrentUserId(null);
                setCurrentUserRole(null);
                setCurrentUserOrgId(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load organization users for new DM
    // For executives, load ALL employees; for others, load based on hierarchy
    const loadOrgUsers = async (orgId, userRole, userId) => {
        try {
            let users = [];
            console.log('Loading org users:', { orgId, userRole, userId });

            // Executive/Admin can see ALL employees in the organization (or all if org_id is null)
            if (userRole === 'executive' || userRole === 'admin') {
                let query = supabase
                    .from('profiles')
                    .select('id, email, full_name, avatar_url, role')
                    .neq('id', userId);

                // Only filter by org_id if it exists
                if (orgId) {
                    query = query.eq('org_id', orgId);
                }

                const { data, error } = await query.order('full_name', { ascending: true, nullsFirst: false });

                if (error) {
                    console.error('Error fetching profiles for executive:', error);
                } else {
                    console.log('Found profiles for executive:', data?.length);
                    users = data || [];
                }
            }
            // Manager can see team leads and employees
            else if (userRole === 'manager') {
                let query = supabase
                    .from('profiles')
                    .select('id, email, full_name, avatar_url, role')
                    .neq('id', userId)
                    .in('role', ['team_lead', 'Team Lead', 'employee', 'Employee']);

                if (orgId) {
                    query = query.eq('org_id', orgId);
                }

                const { data, error } = await query.order('full_name', { ascending: true, nullsFirst: false });

                if (!error && data) {
                    users = data;
                }
            }
            // Team Lead can see employees in their team
            else if (userRole === 'team_lead') {
                let query = supabase
                    .from('profiles')
                    .select('id, email, full_name, avatar_url, role')
                    .neq('id', userId)
                    .in('role', ['employee', 'Employee']);

                if (orgId) {
                    query = query.eq('org_id', orgId);
                }

                const { data, error } = await query.order('full_name', { ascending: true, nullsFirst: false });

                if (!error && data) {
                    users = data;
                }
            }
            // Employee can see team leads and other employees
            else {
                let query = supabase
                    .from('profiles')
                    .select('id, email, full_name, avatar_url, role')
                    .neq('id', userId);

                if (orgId) {
                    query = query.eq('org_id', orgId);
                }

                const { data, error } = await query.order('full_name', { ascending: true, nullsFirst: false });

                if (!error && data) {
                    users = data;
                }
            }

            console.log('Setting org users:', users.length);
            setOrgUsers(users);
        } catch (error) {
            console.error('Error loading org users:', error);
        }
    };

    // Load conversations when category changes
    useEffect(() => {
        if (currentUserId) {
            loadConversations();
        }
    }, [activeCategory, currentUserId]);

    // Subscribe to real-time updates for selected conversation
    useEffect(() => {
        let subscription = null;

        if (selectedConversation) {
            subscription = subscribeToConversation(selectedConversation.id, (newMessage) => {
                setMessages(prev => [...prev, newMessage]);
            });
        }

        return () => {
            if (subscription) {
                unsubscribeFromConversation(subscription);
            }
        };
    }, [selectedConversation]);

    const loadConversations = async () => {
        if (!currentUserId) {
            console.warn('Cannot load conversations: No user ID');
            return;
        }

        setLoading(true);
        try {
            const convs = await getConversationsByCategory(currentUserId, activeCategory);

            // For DM conversations, fetch the other user's name
            if (activeCategory === 'myself') {
                const convsWithNames = await Promise.all(convs.map(async (conv) => {
                    if (conv.type === 'dm' && !conv.name) {
                        // Get conversation members
                        const { data: members } = await supabase
                            .from('conversation_members')
                            .select('user_id')
                            .eq('conversation_id', conv.id);

                        // Find the other user (not current user)
                        const otherUserId = members?.find(m => m.user_id !== currentUserId)?.user_id;

                        if (otherUserId) {
                            // Get other user's profile
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('full_name, email')
                                .eq('id', otherUserId)
                                .single();

                            return {
                                ...conv,
                                name: profile?.full_name || profile?.email || 'User',
                                otherUserId: otherUserId
                            };
                        }
                    }
                    return conv;
                }));
                setConversations(convsWithNames);
            } else {
                setConversations(convs);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            // Don't crash the app, just show empty state
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (conversation) => {
        setSelectedConversation(conversation);
        setLoading(true);

        // Mark conversation as read
        setReadConversations(prev => new Set([...prev, conversation.id]));

        try {
            const msgs = await getConversationMessages(conversation.id);
            setMessages(msgs);
        } catch (error) {
            console.error('Error loading messages:', error);
            // Show empty messages instead of crashing
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() && attachments.length === 0) return;
        if (!selectedConversation) return;

        try {
            let conversationId = selectedConversation.id;

            // If this is a temporary conversation, create a real one first
            if (selectedConversation.temp && selectedConversation.otherUser) {
                console.log('Creating real conversation for temp chat...');
                const realConversation = await createDMConversation(
                    currentUserId,
                    selectedConversation.otherUser.id,
                    currentUserOrgId
                );
                conversationId = realConversation.id;

                // Update the selected conversation to the real one
                setSelectedConversation({
                    ...realConversation,
                    name: selectedConversation.otherUser.full_name || selectedConversation.otherUser.email
                });
            }

            const newMessage = await sendMessage(
                conversationId,
                currentUserId,
                messageInput,
                attachments
            );
            setMessages(prev => [...prev, newMessage]);
            setMessageInput('');
            setAttachments([]);
            setErrorMessage(null);

            // Reload conversations to show the new one
            loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
            // Check for specific errors
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                setErrorMessage('Messaging tables not set up. Please run the SQL setup script in Supabase.');
            } else if (error.code === '22P02') {
                setErrorMessage('Invalid conversation. Please try starting a new chat.');
            } else {
                setErrorMessage(`Failed to send message: ${error.message || 'Unknown error'}`);
            }
        }
    };

    const handleFileAttachment = (e) => {
        const files = Array.from(e.target.files);
        setAttachments(prev => [...prev, ...files]);
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const startNewDM = async (userId) => {
        try {
            console.log('Starting DM with user:', userId);
            setLoading(true);

            // Find the selected user info for display
            const user = orgUsers.find(u => u.id === userId);
            setSelectedUser(user);

            const conversation = await createDMConversation(currentUserId, userId, currentUserOrgId);
            setShowNewDMModal(false);
            setUserSearchQuery('');
            setErrorMessage(null);
            loadConversations();
            loadMessages(conversation);
        } catch (error) {
            console.error('Error creating DM:', error);
            // Check if error is due to missing table
            if (error.message?.includes('does not exist') || error.code === '42P01') {
                setErrorMessage('Messaging database is not set up. Please run the setup_messaging_database.sql script in Supabase.');
            } else {
                setErrorMessage(`Failed to start conversation: ${error.message || 'Unknown error'}`);
            }
            // Keep the modal open so user can see the error
        } finally {
            setLoading(false);
        }
    };

    // Start a chat directly with a user (for quick action)
    const startChatWithUser = async (user) => {
        setSelectedUser(user);
        setShowNewDMModal(false);
        setUserSearchQuery('');
        // For now, just show the user is selected even if conversation can't be created
        setSelectedConversation({
            id: `temp_${user.id}`,
            type: 'dm',
            name: user.full_name || user.email,
            temp: true,
            otherUser: user
        });
        setMessages([]);
    };

    // Create a new team chat with selected members
    const createNewTeamChat = async () => {
        if (!teamName.trim() || selectedTeamMembers.length === 0) {
            setErrorMessage('Please enter a team name and select at least one member');
            return;
        }

        try {
            setLoading(true);
            const conversation = await createTeamConversation(
                currentUserId,
                selectedTeamMembers,
                teamName,
                currentUserOrgId
            );
            setShowTeamModal(false);
            setTeamName('');
            setSelectedTeamMembers([]);
            setErrorMessage(null);
            loadConversations();
            loadMessages(conversation);
        } catch (error) {
            console.error('Error creating team chat:', error);
            setErrorMessage(`Failed to create team chat: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Join or create organization-wide chat
    const joinOrganizationChat = async () => {
        try {
            setLoading(true);
            const conversation = await getOrCreateOrgConversation(currentUserId, currentUserOrgId);
            setErrorMessage(null);
            loadConversations();
            loadMessages(conversation);
        } catch (error) {
            console.error('Error joining org chat:', error);
            setErrorMessage(`Failed to join organization chat: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Toggle member selection for team chat
    const toggleTeamMember = (userId) => {
        setSelectedTeamMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery) return true;
        const lastMsg = conv.conversation_indexes?.[0]?.last_message || '';
        return lastMsg.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const categories = [
        { id: 'myself', label: 'Myself', icon: MessageCircle, description: 'Direct messages' },
        { id: 'team', label: 'Team', icon: Users, description: 'Team conversations' },
        { id: 'organization', label: 'Organization', icon: Building2, description: 'Company-wide chat' }
    ];

    return (
        <div className="messaging-hub">
            {authLoading ? (
                <div className="loading-auth" style={{ padding: '2rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--accent, #6366f1)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : !currentUserId ? (
                <div className="login-prompt" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>Please log in to view your messages.</p>
                    <button onClick={() => {
                        window.location.href = '/login';
                    }} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Go to Login
                    </button>
                </div>
            ) : (
                // Category Selector
                <div className="category-sidebar">
                    <div className="category-header">
                        <h2>Messages</h2>
                    </div>
                    <div className="category-list">
                        {categories.map(category => {
                            const Icon = category.icon;
                            return (
                                <button
                                    key={category.id}
                                    className={`category-item ${activeCategory === category.id ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(category.id)}
                                >
                                    <Icon size={20} />
                                    <div className="category-info">
                                        <span className="category-label">{category.label}</span>
                                        <span className="category-description">{category.description}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Conversation List */}
            <div className="conversation-sidebar">
                <div className="conversation-header">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {activeCategory === 'myself' && (
                        <button
                            className="new-dm-button"
                            onClick={() => setShowNewDMModal(true)}
                        >
                            + New DM
                        </button>
                    )}
                </div>

                <div className="conversation-list">
                    {loading && !selectedConversation ? (
                        <div className="loading-state">Loading conversations...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="empty-state">
                            <MessageCircle size={48} />
                            <p>No conversations yet</p>
                            {activeCategory === 'myself' && (
                                <button onClick={() => setShowNewDMModal(true)}>
                                    Start a conversation
                                </button>
                            )}
                            {activeCategory === 'team' && (
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '1rem' }}>
                                        Create a team chat to collaborate with your colleagues
                                    </p>
                                    <button
                                        onClick={() => setShowTeamModal(true)}
                                        style={{
                                            background: 'var(--accent, #6366f1)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            margin: '0 auto'
                                        }}
                                    >
                                        <Plus size={18} />
                                        Create Team Chat
                                    </button>
                                </div>
                            )}
                            {activeCategory === 'organization' && (
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '1rem' }}>
                                        Join the company-wide chat to connect with everyone
                                    </p>
                                    <button
                                        onClick={joinOrganizationChat}
                                        style={{
                                            background: 'var(--accent, #6366f1)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            margin: '0 auto'
                                        }}
                                        disabled={loading}
                                    >
                                        <Building2 size={18} />
                                        {loading ? 'Joining...' : 'Join Company Chat'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const isUnread = conv.conversation_indexes?.[0]?.last_message && !readConversations.has(conv.id);
                            return (
                                <div
                                    key={conv.id}
                                    className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                                    onClick={() => loadMessages(conv)}
                                    style={{
                                        background: isUnread ? '#f0f4ff' : undefined,
                                        borderLeft: isUnread ? '3px solid #6366f1' : '3px solid transparent'
                                    }}
                                >
                                    <div className="conversation-avatar" style={{ position: 'relative' }}>
                                        {conv.type === 'dm' ? '👤' : conv.type === 'team' ? '👥' : '🏢'}
                                        {isUnread && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-2px',
                                                right: '-2px',
                                                width: '10px',
                                                height: '10px',
                                                background: '#6366f1',
                                                borderRadius: '50%',
                                                border: '2px solid white'
                                            }} />
                                        )}
                                    </div>
                                    <div className="conversation-info">
                                        <div className="conversation-name" style={{
                                            fontWeight: isUnread ? '700' : '500',
                                            color: isUnread ? '#1f2937' : undefined
                                        }}>
                                            {conv.name || 'Conversation'}
                                        </div>
                                        <div className="conversation-preview" style={{
                                            fontWeight: isUnread ? '600' : 'normal',
                                            color: isUnread ? '#374151' : '#6b7280'
                                        }}>
                                            {conv.conversation_indexes?.[0]?.last_message || 'No messages yet'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        {conv.conversation_indexes?.[0]?.last_message_at && (
                                            <div className="conversation-time" style={{
                                                color: isUnread ? '#6366f1' : '#9ca3af',
                                                fontWeight: isUnread ? '600' : 'normal'
                                            }}>
                                                {new Date(conv.conversation_indexes[0].last_message_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Message Thread */}
            <div className="message-thread">
                {selectedConversation ? (
                    <>
                        <div className="thread-header">
                            <div className="thread-info">
                                <h3>{selectedConversation.name || selectedConversation.otherUser?.full_name || 'Conversation'}</h3>
                                <span className="thread-type">
                                    {selectedConversation.type === 'dm' ? 'Direct Message' :
                                        selectedConversation.type === 'team' ? 'Team Chat' : 'Organization'}
                                </span>
                            </div>
                        </div>

                        <div className="messages-container">
                            {selectedConversation.temp ? (
                                <div className="empty-messages" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <MessageCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: '#6366f1' }} />
                                    <h4 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
                                        Chat with {selectedConversation.otherUser?.full_name || 'User'}
                                    </h4>
                                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                                        Send a message to start the conversation!
                                    </p>
                                    <div style={{
                                        padding: '1rem',
                                        background: '#fef3c7',
                                        border: '1px solid #fcd34d',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#92400e',
                                        maxWidth: '400px',
                                        margin: '0 auto'
                                    }}>
                                        <strong>Note:</strong> To enable persistent messaging, run the <code>setup_messaging_database.sql</code> script in Supabase.
                                    </div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="empty-messages">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`message ${msg.sender_user_id === currentUserId ? 'sent' : 'received'}`}
                                    >
                                        <div className="message-bubble">
                                            <div className="message-content">{msg.content}</div>
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="message-attachments">
                                                    {msg.attachments.map(att => (
                                                        <a
                                                            key={att.id}
                                                            href={att.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="attachment-link"
                                                        >
                                                            📎 {att.file_name}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="message-time">
                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="message-input-container">
                            {/* Error Banner */}
                            {errorMessage && (
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    marginBottom: '0.5rem',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '8px',
                                    color: '#b91c1c',
                                    fontSize: '13px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>{errorMessage}</span>
                                    <button
                                        onClick={() => setErrorMessage(null)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {attachments.length > 0 && (
                                <div className="attachments-preview">
                                    {attachments.map((file, index) => (
                                        <div key={index} className="attachment-chip">
                                            <span>{file.name}</span>
                                            <button onClick={() => removeAttachment(index)}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="message-input-box">
                                <label className="attachment-button">
                                    <Paperclip size={20} />
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileAttachment}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                                <button
                                    className="send-button"
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() && attachments.length === 0}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="no-conversation-selected">
                        <MessageCircle size={64} />
                        <h3>Select a conversation</h3>
                        <p>Choose a conversation from the list to start messaging</p>
                    </div>
                )}
            </div>

            {/* New DM Modal */}
            {showNewDMModal && (
                <div className="modal-overlay" onClick={() => { setShowNewDMModal(false); setUserSearchQuery(''); setErrorMessage(null); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ minWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Start a new conversation</h3>
                            <button onClick={() => { setShowNewDMModal(false); setUserSearchQuery(''); setErrorMessage(null); }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {/* Error Message Display */}
                            {errorMessage && (
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    marginBottom: '1rem',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '8px',
                                    color: '#b91c1c',
                                    fontSize: '14px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>{errorMessage}</span>
                                    <button
                                        onClick={() => setErrorMessage(null)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="user-search" style={{ marginBottom: '1rem' }}>
                                <div className="search-box" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                                    <Search size={18} style={{ color: '#888' }} />
                                    <input
                                        type="text"
                                        placeholder="Search employees by name or role..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px' }}
                                        autoFocus
                                    />
                                    {userSearchQuery && (
                                        <button
                                            onClick={() => setUserSearchQuery('')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <X size={16} style={{ color: '#888' }} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {loading && (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
                                    <div className="spinner" style={{
                                        width: '24px',
                                        height: '24px',
                                        border: '3px solid #f3f3f3',
                                        borderTop: '3px solid var(--accent, #6366f1)',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        margin: '0 auto 0.5rem'
                                    }} />
                                    <p>Starting conversation...</p>
                                </div>
                            )}

                            <div className="user-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {orgUsers.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                        <Users size={48} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                        <p>No employees found</p>
                                    </div>
                                ) : (
                                    orgUsers
                                        .filter(user => {
                                            if (!userSearchQuery) return true;
                                            const query = userSearchQuery.toLowerCase();
                                            return (
                                                (user.full_name?.toLowerCase() || '').includes(query) ||
                                                (user.email?.toLowerCase() || '').includes(query) ||
                                                (user.role?.toLowerCase() || '').includes(query)
                                            );
                                        })
                                        .map(user => (
                                            <div
                                                key={user.id}
                                                className="user-item"
                                                onClick={() => startChatWithUser(user)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    cursor: 'pointer',
                                                    borderRadius: '8px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div className="user-avatar" style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    background: '#e5e7eb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    color: '#6366f1'
                                                }}>
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        (user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()
                                                    )}
                                                </div>
                                                <div className="user-info" style={{ flex: 1 }}>
                                                    <div className="user-name" style={{ fontWeight: '500', color: '#1f2937' }}>
                                                        {user.full_name || user.email}
                                                    </div>
                                                    <div className="user-role" style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>
                                                        {user.role}
                                                    </div>
                                                </div>
                                                <MessageCircle size={18} style={{ color: '#9ca3af' }} />
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Chat Modal */}
            {showTeamModal && (
                <div className="modal-overlay" onClick={() => { setShowTeamModal(false); setTeamName(''); setSelectedTeamMembers([]); setErrorMessage(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Create Team Chat</h2>
                            <button onClick={() => { setShowTeamModal(false); setTeamName(''); setSelectedTeamMembers([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            <div style={{ padding: '0.75rem', marginBottom: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '14px' }}>
                                {errorMessage}
                            </div>
                        )}

                        {/* Team Name Input */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Team Name</label>
                            <input
                                type="text"
                                placeholder="Enter team name..."
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        {/* Member Selection */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Select Members ({selectedTeamMembers.length} selected)
                            </label>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                {orgUsers.filter(u => u.id !== currentUserId).length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                        No team members available
                                    </div>
                                ) : (
                                    orgUsers
                                        .filter(u => u.id !== currentUserId)
                                        .map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => toggleTeamMember(user.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #f3f4f6',
                                                    background: selectedTeamMembers.includes(user.id) ? '#eef2ff' : 'transparent'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTeamMembers.includes(user.id)}
                                                    onChange={() => { }}
                                                    style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                                                />
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontWeight: '600',
                                                    fontSize: '14px'
                                                }}>
                                                    {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                                        {user.full_name || user.email}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>
                                                        {user.role}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={createNewTeamChat}
                            disabled={loading || !teamName.trim() || selectedTeamMembers.length === 0}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                background: loading || !teamName.trim() || selectedTeamMembers.length === 0 ? '#d1d5db' : 'var(--accent, #6366f1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loading || !teamName.trim() || selectedTeamMembers.length === 0 ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '15px'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Team Chat'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagingHub;
