import React from 'react';
import GlobalSidebar from '../../../shared/Layout/GlobalSidebar';
import { getSidebarConfig } from '../../../shared/Layout/SidebarMenuConfig';
import { useProject } from '../../context/ProjectContext';

import { useUser } from '../../../shared/context/UserContext';

const Sidebar = (props) => {
    const { currentProject, setCurrentProject, userProjects, projectRole } = useProject();
    const basePath = '/employee-dashboard';
    
    const { org, project } = getSidebarConfig('employee', projectRole, basePath);

    return (
        <GlobalSidebar
            {...props}
            basePath={basePath}
            orgMenuItems={org}
            projectMenuItems={project}
            showProjectSwitcher={true}
            currentProject={currentProject}
            userProjects={userProjects}
            setCurrentProject={setCurrentProject}
            projectRole={projectRole}
        />
    );
};

export default Sidebar;
