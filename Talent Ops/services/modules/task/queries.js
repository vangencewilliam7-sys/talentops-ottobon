import { supabase } from '../../../lib/supabaseClient';

/**
 * Task Queries
 * Handles all read operations for tasks.
 */

/**
 * Fetch tasks with optional filters and profile enrichment.
 * Replaces AllTasksView.fetchData logic.
 * 
 * @param {string} orgId 
 * @param {string} projectId - Optional, used for project-specific views
 * @param {string} viewMode - 'default', 'my_tasks', 'global_tasks'
 * @param {string} userId - Current user ID
 * @param {string} userRole - 'executive', 'manager', 'team_lead', 'employee'
 * @returns {Promise<Array>} Enhanced tasks array
 */
export const getTasks = async (orgId, projectId, viewMode, userId, userRole) => {
    try {
        console.log('--- Service: Fetching Tasks ---');
        console.log('Params:', { orgId, projectId, viewMode, userRole, userId });

        if (!orgId) return [];

        let query = supabase.from('tasks').select('*, phase_validations, projects(name), task_submissions(final_points)');

        // Role-based filtering
        const normalizedRole = (userRole || 'employee').toLowerCase();
        const isPrivileged = ['manager', 'team_lead', 'executive'].includes(normalizedRole);

        if (normalizedRole === 'executive' || viewMode === 'global_tasks') {
            query = query.eq('org_id', orgId);
            if (projectId) query = query.eq('project_id', projectId);
        } else {
            if (!projectId) {
                console.warn('Service: getTasks skipped: No projectId for non-executive role:', normalizedRole);
                return [];
            }

            // Base filter for project context
            query = query.eq('project_id', projectId).eq('org_id', orgId);

            // SECURITY: If not a manager or lead, force 'my_tasks' view logic
            // even if the frontend asked for a default/team view.
            if (viewMode === 'my_tasks' || !isPrivileged) {
                console.log('Service: Enforcing assigned_to filter for role:', normalizedRole);
                query = query.eq('assigned_to', userId);
            }
        }

        // Order by most recent
        query = query.order('id', { ascending: false });

        // Execute Query
        const { data: tasksData, error } = await query;

        if (error) {
            console.error('Service: Supabase Query Error:', error);
            throw error;
        }

        // Efficiently fetch profiles for enrichment
        const userIds = [...new Set((tasksData || []).flatMap(t =>
            [t.assigned_to, t.assigned_by, t.reassigned_to, t.reassigned_from].filter(Boolean)
        ))];

        let profileMap = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds)
                .eq('org_id', orgId);

            profiles?.forEach(p => { profileMap[p.id] = p; });
        }

        // Enrich tasks with profile names
        const enhanced = (tasksData || []).map(task => ({
            ...task,
            assignee_name: profileMap[task.assigned_to]?.full_name || 'Unassigned',
            assignee_avatar: profileMap[task.assigned_to]?.avatar_url,
            assigned_by_name: task.assigned_by_name || profileMap[task.assigned_by]?.full_name || 'Unknown',
            reassigned_from_name: profileMap[task.reassigned_from]?.full_name,
            reassigned_to_name: profileMap[task.reassigned_to]?.full_name,
            // Note: project_name needs to be handled by caller or fetched here. 
            // For now, minimizing deps, caller usually knows project name.
            project_name: task.projects?.name || 'Project',
            final_points: Array.isArray(task.task_submissions) 
                ? task.task_submissions[0]?.final_points 
                : task.task_submissions?.final_points
        }));

        return enhanced;

    } catch (error) {
        console.error('Service: getTasks Error:', error);
        throw error;
    }
};

export const getTaskById = async (taskId, orgId) => {
    let query = supabase.from('tasks').select('*').eq('id', taskId);
    if (orgId) query = query.eq('org_id', orgId);
    
    const { data, error } = await query.single();

    if (error) throw error;
    return data;
};

export const getTaskSteps = async (taskId, orgId) => {
    let query = supabase.from('task_steps').select('*').eq('task_id', taskId);
    if (orgId) query = query.eq('org_id', orgId);
    
    const { data, error } = await query.order('order_index', { ascending: true });

    if (error) throw error;
    return data;
};

/**
 * Fetch potential assignees (employees) for the task module.
 * Logic extracted from AllTasksView.fetchEmployees
 */
export const getTaskAssignees = async (orgId, projectId) => {
    if (!orgId) return [];

    const fetchWithFallback = async (queryFn) => {
        try {
            const { data, error } = await queryFn(true);
            if (error) throw error;
            return data;
        } catch (err) {
            console.warn('Service: Full fetch failed, trying fallback...', err.message);
            const { data, error } = await queryFn(false);
            if (error) {
                console.error('Service: Fallback fetch also failed:', error);
                return [];
            }
            return data;
        }
    };

    if (projectId) {
        const queryFn = async (includeScores) => {
            const selectString = includeScores
                ? `user_id, role, profiles:user_id (id, full_name, email, role, avatar_url, technical_scores)`
                : `user_id, role, profiles:user_id (id, full_name, email, role, avatar_url)`;

            return await supabase
                .from('project_members')
                .select(selectString)
                .eq('project_id', projectId)
                .eq('org_id', orgId);
        };

        const members = await fetchWithFallback(queryFn);

        // Fetch reviews
        const memberIds = members?.map(m => m.user_id).filter(Boolean) || [];
        let reviewsMap = {};
        if (memberIds.length > 0) {
            const { data: reviews } = await supabase
                .from('employee_reviews')
                .select('user_id, manager_development_skills, development_skills')
                .in('user_id', memberIds)
                .eq('org_id', orgId);

            (reviews || []).forEach(r => {
                reviewsMap[r.user_id] = r.manager_development_skills || r.development_skills || {};
            });
        }

        return (members || [])
            .filter(m => m.profiles)
            .map(m => {
                const reviewScores = reviewsMap[m.profiles.id];
                const profileScores = m.profiles.technical_scores;
                const finalScores = (reviewScores && Object.keys(reviewScores).length > 0)
                    ? reviewScores
                    : (profileScores || {});

                return {
                    id: m.profiles.id,
                    full_name: m.profiles.full_name,
                    email: m.profiles.email,
                    role: m.role || m.profiles.role,
                    avatar_url: m.profiles.avatar_url,
                    technical_scores: finalScores
                };
            });
    } else {
        const queryFn = async (includeScores) => {
            const selectString = includeScores
                ? 'id, full_name, email, role, avatar_url, technical_scores'
                : 'id, full_name, email, role, avatar_url';

            return await supabase
                .from('profiles')
                .select(selectString)
                .eq('org_id', orgId);
        };

        const data = await fetchWithFallback(queryFn);

        const userIds = data?.map(u => u.id).filter(Boolean) || [];
        let reviewsMap = {};
        if (userIds.length > 0) {
            const { data: reviews } = await supabase
                .from('employee_reviews')
                .select('user_id, manager_development_skills, development_skills')
                .in('user_id', userIds)
                .eq('org_id', orgId);

            (reviews || []).forEach(r => {
                reviewsMap[r.user_id] = r.manager_development_skills || r.development_skills || {};
            });
        }

        return (data || []).map(p => {
            const reviewScores = reviewsMap[p.id];
            const profileScores = p.technical_scores;
            const finalScores = (reviewScores && Object.keys(reviewScores).length > 0)
                ? reviewScores
                : (profileScores || {});

            return { ...p, technical_scores: finalScores };
        });
    }
};
