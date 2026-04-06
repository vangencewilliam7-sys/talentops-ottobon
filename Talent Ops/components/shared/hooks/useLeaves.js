import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export const isWeekday = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day !== 0 && day !== 6;
};

export const calculateWeekdayDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
};

export const useLeaves = (orgId, userId, viewMode = 'personal') => {
    const [leaves, setLeaves] = useState([]);
    const [leaveStats, setLeaveStats] = useState([]);
    const [remainingLeaves, setRemainingLeaves] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLeaves = useCallback(async () => {
        if (!orgId) return;
        setIsLoading(true);
        setError(null);

        try {
            if (viewMode === 'personal' && userId) {
                // Fetch user's own leaves
                const { data: leavesData, error: leavesError } = await supabase
                    .from('leaves')
                    .select('*')
                    .eq('employee_id', userId)
                    .eq('org_id', orgId)
                    .order('created_at', { ascending: false });

                if (leavesError) throw leavesError;
                
                // Get current month and year for balance calculation
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                let monthlyQuota = 1; // Default to 1 per user request
                
                const { data: userData, error: userError } = await supabase
                    .from('profiles')
                    .select('monthly_leave_quota, total_leaves_balance')
                    .eq('id', userId)
                    .eq('org_id', orgId)
                    .single();

                if (!userError && userData) {
                    // Use monthly_leave_quota if available, otherwise default to 1
                    monthlyQuota = userData.monthly_leave_quota || 1;
                }

                // Calculate leaves taken/pending in the current month
                const leavesThisMonth = leavesData ? leavesData.filter(leave => {
                    const leaveDate = new Date(leave.from_date);
                    // Only count approved or pending leaves for the current month
                    return (leave.status === 'approved' || leave.status === 'pending') && 
                           leaveDate.getMonth() === currentMonth && 
                           leaveDate.getFullYear() === currentYear &&
                           !(leave.reason && leave.reason.toLowerCase().includes('loss of pay'));
                }) : [];

                const daysTakenThisMonth = leavesThisMonth.reduce((sum, leave) => {
                    const duration = leave.duration_weekdays || 1;
                    // We only count the 'paid' portion. If lop_days is already set, subtract it.
                    const paidDuration = Math.max(0, duration - (leave.lop_days || 0));
                    return sum + paidDuration;
                }, 0);

                setRemainingLeaves(Math.max(0, monthlyQuota - daysTakenThisMonth));

                if (leavesData) {
                    const mappedLeaves = leavesData.map(leave => {
                        const start = new Date(leave.from_date);
                        const end = new Date(leave.to_date);
                        const diffDays = leave.duration_weekdays || calculateWeekdayDuration(leave.from_date, leave.to_date);

                        let type = 'Leave';
                        let reason = leave.reason || '';
                        if (reason.includes(':')) {
                            type = reason.split(':')[0];
                        } else if (leave.leave_type) {
                            type = leave.leave_type;
                        }

                        const displayDuration = diffDays === 1 ? '1 Day' : `${diffDays} Days`;
                        const lopSuffix = leave.lop_days > 0 ? ` (+${leave.lop_days} LOP)` : '';
                        const status = leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1).toLowerCase() : 'Pending';

                        return {
                            id: leave.id,
                            employee_id: leave.employee_id,
                            type: type,
                            reason: leave.reason || 'No reason provided',
                            startDate: leave.from_date,
                            endDate: leave.to_date,
                            duration: displayDuration + lopSuffix,
                            duration_weekdays: diffDays,
                            lop_days: leave.lop_days || 0,
                            dates: start.toDateString() === end.toDateString()
                                ? start.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
                                : `${start.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`,
                            status: status,
                            appliedOn: leave.created_at ? new Date(leave.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A',
                            created_at: leave.created_at
                        };
                    });

                    // Sort Pending first
                    mappedLeaves.sort((a, b) => {
                        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                        return new Date(b.created_at) - new Date(a.created_at);
                    });

                    setLeaves(mappedLeaves);
                }
            } else if (viewMode === 'manager' || viewMode === 'org') {
                // Fetch organizational leaves for managers and executives
                const { data: leavesData, error: leavesError } = await supabase
                    .from('leaves')
                    .select('*')
                    .eq('org_id', orgId);

                if (leavesError) throw leavesError;

                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, total_leaves_balance')
                    .eq('org_id', orgId);

                if (profilesError) throw profilesError;

                const profileMap = {};
                if (profilesData) {
                    profilesData.forEach(p => {
                        profileMap[p.id] = p.full_name;
                    });
                }

                if (leavesData) {
                    const mappedLeaves = leavesData.map(leave => {
                        const start = new Date(leave.from_date);
                        const end = new Date(leave.to_date);
                        const diffTime = Math.abs(end - start);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                        let type = 'Leave';
                        let reason = leave.reason || '';
                        if (reason.includes(':')) {
                            type = reason.split(':')[0];
                        } else if (leave.leave_type) {
                            type = leave.leave_type;
                        }

                        const name = profileMap[leave.employee_id] || 'Unknown';

                        return {
                            id: leave.id,
                            employee_id: leave.employee_id,
                            name: name,
                            type: type,
                            reason: leave.reason || 'No reason provided',
                            startDate: leave.from_date,
                            endDate: leave.to_date,
                            duration: `${diffDays} Days`,
                            duration_weekdays: leave.duration_weekdays,
                            lop_days: leave.lop_days,
                            dates: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                            status: leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1).toLowerCase() : 'Pending',
                            created_at: leave.created_at
                        };
                    });

                    mappedLeaves.sort((a, b) => {
                        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    });

                    setLeaves(mappedLeaves);
                }

                // If asking for org stats
                if (viewMode === 'org' && profilesData && leavesData) {
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    const currentYear = now.getFullYear();

                    // Filter for current month only for the 'Leaves Left' calculation
                    const currentMonthLeaves = leavesData.filter(l => {
                        const d = new Date(l.from_date);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && l.status === 'approved';
                    });

                    const stats = profilesData.map(profile => {
                        // Current Month specific stats
                        const empMonthLeaves = currentMonthLeaves.filter(l => l.employee_id === profile.id);
                        const monthPaid = empMonthLeaves.reduce((sum, l) => sum + (l.duration_weekdays || 0), 0);
                        
                        // All-time stats (for general history)
                        const empAllLeaves = leavesData.filter(l => l.employee_id === profile.id && l.status === 'approved');
                        const totalPaid = empAllLeaves.reduce((sum, l) => sum + (l.duration_weekdays || 0), 0);
                        const totalLop = empAllLeaves.reduce((sum, l) => sum + (l.lop_days || 0), 0);

                        // Policy: 1 day per month
                        const monthlyQuota = 1; 
                        const leavesLeft = Math.max(0, monthlyQuota - monthPaid);

                        return {
                            id: profile.id,
                            name: profile.full_name,
                            total_taken: `${totalPaid + totalLop} Days`,
                            paid_leaves: `${totalPaid} Days`,
                            lop_days: `${totalLop} Days`,
                            leaves_left: `${leavesLeft} / ${monthlyQuota} (This Month)`
                        };
                    });
                    setLeaveStats(stats);
                }
            }

        } catch (err) {
            console.error('Error in useLeaves:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgId, userId, viewMode]);

    useEffect(() => {
        fetchLeaves();
    }, [fetchLeaves]);

    useEffect(() => {
        if (!orgId) return;

        const channel = supabase
            .channel(`leaves-channel-${orgId}-${viewMode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => {
                fetchLeaves();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId, viewMode, fetchLeaves]);

    const calculateLeaveAttribution = useCallback((startDate, endDate, specificDates = []) => {
        const quota = remainingLeaves;
        let totalDays = 0;

        if (specificDates && specificDates.length > 0) {
            totalDays = specificDates.length;
        } else if (startDate && endDate) {
            totalDays = calculateWeekdayDuration(startDate, endDate);
        }

        const paid = Math.min(totalDays, quota);
        const lop = Math.max(0, totalDays - paid);

        return {
            paid,
            lop,
            total: totalDays
        };
    }, [remainingLeaves]);

    return {
        leaves,
        leaveStats,
        remainingLeaves,
        calculateLeaveAttribution,
        isLoading,
        error,
        refetch: fetchLeaves
    };
};
