import React from 'react';
import GlobalSidebar from '../../../shared/Layout/GlobalSidebar';
import { getSidebarConfig } from '../../../shared/Layout/SidebarMenuConfig';

const Sidebar = (props) => {
    const basePath = '/executive-dashboard';
    
    // Executive has fixed project options and no internal project-switcher picker
    const { org, project } = getSidebarConfig('executive', null, basePath);

    return (
        <GlobalSidebar
            {...props}
            basePath={basePath}
            orgMenuItems={org}
            projectMenuItems={project}
            showProjectSwitcher={false}
        />
    );
};

export default Sidebar;
