import React, { useState, useEffect } from 'react';
import { Plus, Users, FolderOpen, UserPlus, X, Trash2, Search, Building2, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

const ProjectManagement = ({ addToast = () => { } }) => {
    const [projects, setProjects] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showAddProject, setShowAddProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [searchUser, setSearchUser] = useState('');
    const [selectedRole, setSelectedRole] = useState('employee');

    useEffect(() => {
        fetchProjects();
        fetchAllUsers();
    }, []);

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setProjects(data || []);
            if (data?.length > 0 && !selectedProject) {
                setSelectedProject(data[0]);
                fetchProjectMembers(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('id, full_name, email, role').order('full_name');
            if (error) throw error;
            setAllUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchProjectMembers = async (projectId) => {
        try {
            const { data, error } = await supabase
                .from('project_members')
                .select('*, profiles:user_id(id, full_name, email)')
                .eq('project_id', projectId);
            if (error) throw error;
            setProjectMembers(data || []);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const createProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const { data, error } = await supabase.from('projects').insert({ name: newProjectName.trim() }).select().single();
            if (error) throw error;
            setProjects([data, ...projects]);
            setNewProjectName('');
            setShowAddProject(false);
            addToast?.('Project created!', 'success');
        } catch (error) {
            addToast?.('Failed to create project', 'error');
        }
    };

    const addMember = async (userId) => {
        if (!selectedProject) return;
        try {
            const { error } = await supabase.from('project_members').insert({
                project_id: selectedProject.id,
                user_id: userId,
                role: selectedRole
            });
            if (error) throw error;
            fetchProjectMembers(selectedProject.id);
            setShowAddMember(false);
            setSearchUser('');
            addToast?.('Member added!', 'success');
        } catch (error) {
            if (error.code === '23505') {
                addToast?.('User already in this project', 'error');
            } else {
                addToast?.('Failed to add member', 'error');
            }
        }
    };

    const removeMember = async (memberId) => {
        try {
            const { error } = await supabase.from('project_members').delete().eq('id', memberId);
            if (error) throw error;
            setProjectMembers(projectMembers.filter(m => m.id !== memberId));
            addToast?.('Member removed', 'success');
        } catch (error) {
            addToast?.('Failed to remove member', 'error');
        }
    };

    const updateMemberRole = async (memberId, newRole) => {
        try {
            const { error } = await supabase.from('project_members').update({ role: newRole }).eq('id', memberId);
            if (error) throw error;
            setProjectMembers(projectMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            addToast?.('Role updated', 'success');
        } catch (error) {
            addToast?.('Failed to update role', 'error');
        }
    };

    const getRoleBadge = (role) => {
        const styles = {
            manager: { bg: '#fef3c7', color: '#b45309' },
            team_lead: { bg: '#dbeafe', color: '#1d4ed8' },
            employee: { bg: '#f3f4f6', color: '#374151' }
        };
        return styles[role] || styles.employee;
    };

    const filteredUsers = allUsers.filter(u =>
        !projectMembers.find(m => m.user_id === u.id) &&
        (u.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchUser.toLowerCase()))
    );

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading projects...</div>;
    }

    return (
        <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
            {/* Projects List */}
            <div style={{ width: '280px', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderOpen size={18} /> Projects
                    </h3>
                    <button onClick={() => setShowAddProject(true)} style={{ background: '#8b5cf6', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white' }}>
                        <Plus size={18} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {projects.map(project => (
                        <div key={project.id} onClick={() => { setSelectedProject(project); fetchProjectMembers(project.id); }}
                            style={{
                                padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                                backgroundColor: selectedProject?.id === project.id ? '#ede9fe' : 'transparent',
                                borderLeft: selectedProject?.id === project.id ? '3px solid #8b5cf6' : '3px solid transparent'
                            }}>
                            <div style={{ fontWeight: 600 }}>{project.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{project.status || 'active'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Project Members */}
            <div style={{ flex: 1, backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {selectedProject ? (
                    <>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedProject.name}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{projectMembers.length} members</p>
                            </div>
                            <button onClick={() => setShowAddMember(true)} style={{
                                padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <UserPlus size={18} /> Add Member
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                            {projectMembers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    <Users size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                    <p>No members yet. Add team members to get started.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {projectMembers.map(member => {
                                        const badge = getRoleBadge(member.role);
                                        return (
                                            <div key={member.id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '14px 16px', backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                                                        {member.profiles?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{member.profiles?.full_name || 'Unknown'}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{member.profiles?.email}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <select value={member.role} onChange={(e) => updateMemberRole(member.id, e.target.value)}
                                                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: badge.bg, color: badge.color, fontWeight: 600, cursor: 'pointer' }}>
                                                        <option value="employee">Employee</option>
                                                        <option value="team_lead">Team Lead</option>
                                                        <option value="manager">Manager</option>
                                                    </select>
                                                    <button onClick={() => removeMember(member.id)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #fee2e2', backgroundColor: '#fff', cursor: 'pointer', color: '#ef4444' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        Select a project to manage members
                    </div>
                )}
            </div>

            {/* Add Project Modal */}
            {showAddProject && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '400px' }}>
                        <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Create New Project</h3>
                        <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name..."
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', fontSize: '1rem' }}
                            onKeyPress={(e) => e.key === 'Enter' && createProject()} autoFocus />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowAddProject(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={createProject} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMember && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontWeight: 700 }}>Add Member to {selectedProject?.name}</h3>
                            <button onClick={() => setShowAddMember(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input type="text" value={searchUser} onChange={(e) => setSearchUser(e.target.value)} placeholder="Search users..."
                                    style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                            </div>
                            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <option value="employee">Employee</option>
                                <option value="team_lead">Team Lead</option>
                                <option value="manager">Manager</option>
                            </select>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found</div>
                            ) : (
                                filteredUsers.map(user => (
                                    <div key={user.id} onClick={() => addMember(user.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                            {user.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                                        </div>
                                        <Plus size={18} color="#8b5cf6" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectManagement;
