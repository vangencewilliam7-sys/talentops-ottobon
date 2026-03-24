import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';

const globalAudio = new Audio('/notification.mp3');
globalAudio.preload = 'auto';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [userId, setUserId] = useState(null);
    const { addToast } = useToast();
    const navigate = useNavigate();

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
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`app-notifs-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `receiver_id=eq.${userId}`
                },
                (payload) => {
                    const notif = payload.new;
                    
                    // Messages are handled purely by MessageContext
                    if (notif.type === 'message') return;

                    let type = 'info';
                    
                    if (notif.type === 'task_phase_approved') {
                        type = 'success';
                    } else if (notif.type === 'task_phase_rejected') {
                        type = 'error'; // Error is red toast
                    }

                    if (addToast) {
                        addToast(notif.message || 'You have a new update', type);
                        
                        try {
                            globalAudio.currentTime = 0;
                            globalAudio.play().catch(() => {});
                        } catch (e) {}
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, addToast, navigate]);

    return (
        <NotificationContext.Provider value={{}}>
            {children}
        </NotificationContext.Provider>
    );
};
