import React, { useState } from 'react';
import {
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    LogOut,
    Building2,
    FolderKanban,
    Check
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMessages } from '../context/MessageContext';

const GlobalSidebar = ({
    isCollapsed,
    toggleSidebar,
    onMouseEnter,
    onMouseLeave,
    basePath,
    orgMenuItems = [],
    projectMenuItems = [],
    // Project switcher props (optional)
    showProjectSwitcher = false,
    currentProject = null,
    userProjects = [],
    setCurrentProject = null,
    projectRole = 'consultant' // Used just for the small colored badge next to project
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useMessages();

    const [expandedMenus, setExpandedMenus] = useState({
        organization: true,
        project: true
    });
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    const toggleMenu = (label) => {
        if (isCollapsed) return;
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const getRoleBadge = (role) => {
        switch (role?.toLowerCase()) {
            case 'manager': return { color: '#ef4444', label: 'Manager' };
            case 'team_lead': return { color: '#eab308', label: 'Team Lead' };
            case 'executive': return { color: '#8b5cf6', label: 'Executive' };
            default: return { color: '#22c55e', label: 'Consultant' };
        }
    };

    const renderMenuItem = (item, index, keyPrefix) => {
        const isActive = location.pathname === item.path;
        return (
            <button
                key={`${keyPrefix}-${index}`}
                onClick={() => navigate(item.path)}
                title={isCollapsed ? item.label : ''}
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isActive ? 'var(--accent, #7C3AED)' : 'transparent',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'white';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }
                }}
            >
                <item.icon size={18} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>{item.label}</span>}

                {!isCollapsed && item.label === 'Messages' && unreadCount > 0 && (
                    <div style={{ marginLeft: 'auto', backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '9999px', minWidth: '18px', textAlign: 'center' }}>
                        {unreadCount}
                    </div>
                )}
                {isCollapsed && item.label === 'Messages' && unreadCount > 0 && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#ef4444', width: '8px', height: '8px', borderRadius: '50%' }} />
                )}
            </button>
        );
    };

    const renderSectionHeader = (icon, label, sectionKey) => (
        <button
            onClick={() => toggleMenu(sectionKey)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '8px',
                background: sectionKey === 'project' ? 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(124,58,237,0.1) 100%)' : 'rgba(255,255,255,0.05)',
                border: sectionKey === 'project' ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: sectionKey === 'project' ? '#a78bfa' : 'rgba(255,255,255,0.9)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {React.createElement(icon, { size: 15 })}
                {!isCollapsed && <span>{label}</span>}
            </div>
            {!isCollapsed && (
                <ChevronDown size={14} style={{ transform: expandedMenus[sectionKey] ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s' }} />
            )}
        </button>
    );

    return (
        <aside
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                width: isCollapsed ? '70px' : '240px',
                backgroundColor: 'var(--sidebar-bg, #1a1a2e)',
                color: 'white',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '12px',
                zIndex: 1000,
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '0 8px 8px 0',
                willChange: 'width',
                transform: 'translateZ(0)'
            }}>
            <style>
                {`
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}
            </style>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', height: '40px' }}>
                {!isCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Talent Ops</h1>
                    </div>
                )}
                <button
                    onClick={toggleSidebar}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }} className="no-scrollbar">
                
                {/* Organization Section */}
                {orgMenuItems.length > 0 && (
                    <>
                        {renderSectionHeader(Building2, 'Organization', 'organization')}
                        {(expandedMenus.organization || isCollapsed) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
                                {orgMenuItems.map((item, idx) => renderMenuItem(item, idx, 'org'))}
                            </div>
                        )}
                    </>
                )}

                {/* Project Switcher */}
                {showProjectSwitcher && userProjects?.length > 0 && (
                    <>
                        {/* Dropdown triggers */}
                        {!isCollapsed && (
                            <div style={{ marginBottom: '16px', position: 'relative' }}>
                                <div style={{ fontSize: '0.65rem', color: '#8b5cf6', marginBottom: '10px', fontWeight: 700, paddingLeft: '4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                    CURRENT PROJECT
                                </div>
                                <button
                                    onClick={() => setShowProjectPicker(!showProjectPicker)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(124,58,237,0.1) 100%)',
                                        border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '12px 14px',
                                        color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.3s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getRoleBadge(projectRole).color, boxShadow: `0 0 8px ${getRoleBadge(projectRole).color}` }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                            {currentProject?.name || 'Select...'}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} style={{ transform: showProjectPicker ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                                </button>

                                {/* Dropdown popover */}
                                {showProjectPicker && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        background: 'var(--sidebar-bg, #1e1e38)', borderRadius: '12px', marginTop: '8px',
                                        boxShadow: '0 16px 48px rgba(0,0,0,0.5)', zIndex: 100, overflow: 'hidden', border: '1px solid rgba(139,92,246,0.2)'
                                    }}>
                                        {userProjects.map((project) => (
                                            <button
                                                key={project.id}
                                                onClick={() => {
                                                    if(setCurrentProject) setCurrentProject(project.id);
                                                    setShowProjectPicker(false);
                                                }}
                                                style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '14px 16px', border: 'none', background: currentProject?.id === project.id ? 'rgba(139,92,246,0.2)' : 'transparent',
                                                    color: 'white', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getRoleBadge(project.role).color }} />
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{project.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{getRoleBadge(project.role).label}</div>
                                                    </div>
                                                </div>
                                                {currentProject?.id === project.id && <Check size={16} style={{ color: '#a78bfa' }} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Project Section Items */}
                {projectMenuItems.length > 0 && (
                    <>
                        {renderSectionHeader(FolderKanban, currentProject?.name || 'Project Overview', 'project')}
                        {(expandedMenus.project || isCollapsed) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {projectMenuItems.map((item, idx) => renderMenuItem(item, idx, 'proj'))}
                            </div>
                        )}
                    </>
                )}
            </nav>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '12px' }}>
                <button
                    onClick={() => navigate(`${basePath}/settings`)}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '10px', padding: '12px', borderRadius: '8px', width: '100%', border: 'none', cursor: 'pointer',
                        background: location.pathname === `${basePath}/settings` ? 'var(--accent, #7C3AED)' : 'transparent',
                        color: location.pathname === `${basePath}/settings` ? 'white' : 'rgba(255,255,255,0.7)',
                        fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', transition: 'all 0.2s'
                    }}
                >
                    <Settings size={18} />
                    {!isCollapsed && <span>Profile</span>}
                </button>

                <button
                    onClick={() => navigate('/login')}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '10px', padding: '12px', borderRadius: '8px', width: '100%', border: 'none', cursor: 'pointer',
                        background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s'
                    }}
                >
                    <LogOut size={18} />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
};

export default GlobalSidebar;
