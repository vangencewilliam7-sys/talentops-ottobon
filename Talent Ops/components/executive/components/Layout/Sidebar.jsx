import React from 'react';
import GlobalSidebar from '../../../shared/Layout/GlobalSidebar';
import { getSidebarConfig } from '../../../shared/Layout/SidebarMenuConfig';
import { useUser } from '../../../shared/context/UserContext';

const Sidebar = (props) => {
    const basePath = '/executive-dashboard';
    
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
