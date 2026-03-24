import React from 'react';
// @ts-ignore
import HierarchyDemo from '../../shared/HierarchyDemo';

const OrgHierarchy = () => {
    return (
        <div style={{ 
            height: 'calc(100vh - 64px)', 
            margin: '-1.5rem', 
            overflow: 'hidden', 
            backgroundColor: '#f8fafc' 
        }}>
            <HierarchyDemo />
        </div>
    );
};

export default OrgHierarchy;
