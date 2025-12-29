import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const ProjectContext = createContext(null);

// Default values to prevent destructuring errors
const defaultContextValue = {
    currentProject: null,
    setCurrentProject: () => { },
    userProjects: [],
    projectRole: null,
    loading: true,
    hasMultipleProjects: false
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    return context || defaultContextValue;
};

export const ProjectProvider = ({ children }) => {
    const [currentProject, setCurrentProject] = useState(null);
    const [userProjects, setUserProjects] = useState([]);
    const [projectRole, setProjectRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user's projects on mount - optimized single query
    useEffect(() => {
        let isMounted = true;

        const fetchUserProjects = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !isMounted) {
                    setLoading(false);
                    return;
                }

                // Single optimized query with join
                const { data: memberships, error } = await supabase
                    .from('project_members')
                    .select('id, role, project_id, projects(id, name, status)')
                    .eq('user_id', user.id);

                if (error || !memberships || !isMounted) {
                    setLoading(false);
                    return;
                }

                // Map to simplified project objects
                const projects = memberships
                    .filter(m => m.projects)
                    .map(m => ({
                        id: m.projects.id,
                        name: m.projects.name,
                        status: m.projects.status || 'active',
                        role: m.role,
                        membershipId: m.id
                    }));

                if (projects.length > 0 && isMounted) {
                    setUserProjects(projects);
                    setCurrentProject(projects[0]);
                    setProjectRole(projects[0].role);
                }

                setLoading(false);
            } catch (err) {
                if (isMounted) setLoading(false);
            }
        };

        fetchUserProjects();

        return () => { isMounted = false; };
    }, []);

    // Memoize switch function
    const switchProject = useMemo(() => (projectId) => {
        const project = userProjects.find(p => p.id === projectId);
        if (project) {
            setCurrentProject(project);
            setProjectRole(project.role);
        }
    }, [userProjects]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        currentProject,
        setCurrentProject: switchProject,
        userProjects,
        projectRole,
        loading,
        hasMultipleProjects: userProjects.length > 1
    }), [currentProject, switchProject, userProjects, projectRole, loading]);

    return (
        <ProjectContext.Provider value={contextValue}>
            {children}
        </ProjectContext.Provider>
    );
};
