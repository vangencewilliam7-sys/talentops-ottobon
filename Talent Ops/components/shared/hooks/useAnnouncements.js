import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export const useAnnouncements = (userId, orgId) => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userTeamId, setUserTeamId] = useState(null);

    const fetchAnnouncements = useCallback(async (showLoader = false) => {
        try {
            if (showLoader || announcements.length === 0) setLoading(true);
            setError(null);

            // Fetch User Profile to get team_id
            if (userId) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('team_id')
                    .eq('id', userId)
                    .single();
                if (profile) {
                    setUserTeamId(profile.team_id);
                }
            }

            const { data, error: rpcError } = await supabase.rpc('get_my_announcements');
            if (rpcError) throw rpcError;

            let allEvents = data || [];

            // Fetch Holidays
            const currentYear = new Date().getFullYear();
            const { data: holidays } = await supabase
                .from('organization_holidays')
                .select('*')
                .gte('holiday_date', `${currentYear}-01-01`);

            if (holidays) {
                const todayStr = new Date().toISOString().split('T')[0];
                const holidayEvents = holidays.map(h => {
                    let status = 'future';
                    if (h.holiday_date < todayStr) status = 'completed';
                    if (h.holiday_date === todayStr) status = 'active';

                    return {
                        id: h.id,
                        title: `${h.holiday_name} (${h.holiday_type === 'public' ? 'Public' : 'Company'} Holiday)`,
                        event_date: h.holiday_date,
                        event_time: '00:00:00',
                        location: 'Organization Wide',
                        message: `Scheduled ${h.holiday_type} holiday to observe ${h.holiday_name}.`,
                        event_for: 'all',
                        teams: [],
                        employees: [],
                        created_at: h.created_at || new Date().toISOString(),
                        status: status,
                        type: 'holiday',
                        isHoliday: true
                    };
                });
                allEvents = [...allEvents, ...holidayEvents];
            }

            allEvents.sort((a, b) => {
                const dateA = new Date(`${a.event_date}T${a.event_time}`);
                const dateB = new Date(`${b.event_date}T${b.event_time}`);
                return dateA - dateB;
            });

            setAnnouncements(allEvents);
        } catch (err) {
            console.error('Error in fetchAnnouncements:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [userId, orgId]);

    useEffect(() => {
        if (userId && orgId) {
            fetchAnnouncements(true);
            
            // Real-time subscription to auto-refresh announcements
            const channel = supabase.channel('announcements-changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'announcements' },
                    () => {
                        fetchAnnouncements(false);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [userId, orgId, fetchAnnouncements]);

    const updateAnnouncementStatus = async (eventId, newStatus) => {
        const { error } = await supabase.rpc('update_announcement_status', {
            p_announcement_id: eventId,
            p_status: newStatus
        });
        if (error) throw error;
        setAnnouncements(prev => prev.map(ev => ev.id === eventId ? { ...ev, status: newStatus } : ev));
    };

    const deleteAnnouncement = async (eventId) => {
        const { error } = await supabase.rpc('delete_announcement', { p_announcement_id: eventId });
        if (error) throw error;
        setAnnouncements(prev => prev.filter(ev => ev.id !== eventId));
    };

    return { 
        announcements, 
        loading, 
        error, 
        userTeamId,
        refetchAnnouncements: fetchAnnouncements,
        updateAnnouncementStatus,
        deleteAnnouncement
    };
};
