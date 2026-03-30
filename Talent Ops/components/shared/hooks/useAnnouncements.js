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
                    .eq('org_id', orgId)
                    .single();
                if (profile) {
                    setUserTeamId(profile.team_id);
                }
            }

            console.log(`[useAnnouncements] Fetching for orgId: ${orgId}`);
            let allEvents = [];

            try {
                const { data: rpcResponse, error: rpcError } = await supabase.rpc('get_my_announcements', { p_org_id: orgId });
                
                if (rpcError) {
                    console.warn('[useAnnouncements] RPC fetch failed, attempting table fallback:', rpcError);
                    
                    // Fallback to direct table fetch if RPC is missing
                    const { data: tableAnnouncements, error: tableError } = await supabase
                        .from('announcements')
                        .select('*')
                        .eq('org_id', orgId);
                    
                    if (tableError) {
                        console.error('[useAnnouncements] Table fallback also failed:', tableError);
                    } else if (tableAnnouncements) {
                        console.log(`[useAnnouncements] Fallback successfully fetched ${tableAnnouncements.length} items.`);
                        allEvents = tableAnnouncements.map(a => ({
                            ...a,
                            status: new Date(a.event_date) > new Date() ? 'future' : 
                                    new Date(a.event_date).toDateString() === new Date().toDateString() ? 'active' : 'completed'
                        }));
                    }
                } else if (rpcResponse && rpcResponse.success) {
                    allEvents = rpcResponse.data || [];
                }
            } catch (err) {
                console.error('[useAnnouncements] Unexpected error in announcement fetch flow:', err);
            }

            // Fetch Holidays - Crucial that this always runs
            const currentYear = new Date().getFullYear();
            console.log(`[useAnnouncements] Fetching holidays for year ${currentYear}...`);
            const { data: holidays, error: holidayError } = await supabase
                .from('organization_holidays')
                .select('*')
                .eq('org_id', orgId)
                .gte('holiday_date', `${currentYear}-01-01`);

            if (holidayError) {
                console.error('[useAnnouncements] Holiday fetch error:', holidayError);
            } else {
                console.log(`[useAnnouncements] Successfully fetched ${holidays?.length || 0} holidays.`);
            }

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
    }, [orgId]);

    useEffect(() => {
        if (orgId) {
            fetchAnnouncements(true);
            
            // Real-time subscription for both Announcements and Holidays
            const channel = supabase.channel(`announcements-wide-${orgId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'announcements', filter: `org_id=eq.${orgId}` },
                    (payload) => {
                        console.log('[useAnnouncements] Announcement change detected:', payload);
                        fetchAnnouncements(false);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'organization_holidays', filter: `org_id=eq.${orgId}` },
                    (payload) => {
                        console.log('[useAnnouncements] Holiday change detected:', payload);
                        fetchAnnouncements(false);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [orgId, fetchAnnouncements]);

    const updateAnnouncementStatus = async (eventId, newStatus) => {
        const { error } = await supabase.rpc('update_announcement_status', {
            p_announcement_id: eventId,
            p_status: newStatus,
            p_org_id: orgId
        });
        if (error) throw error;
        setAnnouncements(prev => prev.map(ev => ev.id === eventId ? { ...ev, status: newStatus } : ev));
    };

    const deleteAnnouncement = async (eventId) => {
        const { error } = await supabase.rpc('delete_announcement', { 
            p_announcement_id: eventId,
            p_org_id: orgId 
        });
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
