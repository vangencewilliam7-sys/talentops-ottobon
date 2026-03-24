import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const UserContext = createContext();

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export const UserProvider = ({ children }) => {
    const [userName, setUserName] = useState('Loading...');
    const [userRole, setUserRole] = useState('User');
    const [userStatus, setUserStatus] = useState('Offline');
    const [userTask, setUserTask] = useState('');
    const [lastActive, setLastActive] = useState('Now');
    const [userId, setUserId] = useState(null);
    const [orgId, setOrgId] = useState(null);
    const [teamId, setTeamId] = useState(null); // Project ID
    const [currentTeam, setCurrentTeam] = useState('All'); // For filtering
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                // 1. Get current auth user
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setUserId(user.id);

                    // 2. Fetch profile (Name, Role, Org)
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('full_name, email, role, org_id, team_id')
                        .eq('id', user.id)
                        .single();

                    if (profileError) {
                        console.error('Error fetching user profile:', profileError);
                        setUserName(user.email || 'User');
                        setUserRole('User');
                    } else if (profile) {
                        setUserName(profile.full_name || profile.email || 'User');
                        setUserRole(profile.role || 'User');
                        setOrgId(profile.org_id);
                        
                        // Use team_id if available, otherwise check project_members
                        if (profile.team_id) {
                            setTeamId(profile.team_id);
                        } else {
                            const { data: projectMember } = await supabase
                                .from('project_members')
                                .select('project_id')
                                .eq('user_id', user.id)
                                .maybeSingle();
                            setTeamId(projectMember?.project_id || null);
                        }
                    }

                    // 3. Attendance Monitoring (via RPC instead of direct table access)
                    const { data: attendanceData, error: attendanceError } = await supabase.rpc('get_my_attendance_status');

                    if (!attendanceError && attendanceData) {
                        const attData = Array.isArray(attendanceData) ? attendanceData[0] : attendanceData;
                        if (attData && attData.clock_in && !attData.clock_out) {
                            setUserStatus(attData.status === 'break' ? 'Away' : 'Online');
                            if (attData.current_task) setUserTask(attData.current_task);
                        } else {
                            setUserStatus('Offline');
                        }
                    } else {
                        setUserStatus('Offline');
                    }

                } else {
                    // No user logged in
                    setUserName('Guest');
                    setUserRole('Guest');
                    setUserId(null);
                    setOrgId(null);
                    setTeamId(null);
                }
            } catch (err) {
                console.error('CRITICAL: Error in fetchUserData:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const value = {
        userName, setUserName,
        userRole, setUserRole,
        userStatus, setUserStatus,
        userTask, setUserTask,
        lastActive, setLastActive,
        userId,
        orgId,
        teamId, setTeamId,
        currentTeam, setCurrentTeam,
        loading
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
