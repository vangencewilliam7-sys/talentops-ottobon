import React from 'react';
import GlobalSidebar from '../../../shared/Layout/GlobalSidebar';
import { getSidebarConfig } from '../../../shared/Layout/SidebarMenuConfig';
import { useProject } from '../../../employee/context/ProjectContext';

import { useUser } from '../../../shared/context/UserContext';

const Sidebar = (props) => {
    const { currentProject, setCurrentProject, userProjects, projectRole } = useProject();
    const basePath = '/teamlead-dashboard';
    
    // Team leads are 'team_lead' inside UserContext, but the Config handles both variants.
    const { org, project } = getSidebarConfig('team_lead', projectRole, basePath);

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
            projectRole={projectRole || 'team_lead'}
        />
    );
};

export default Sidebar;
