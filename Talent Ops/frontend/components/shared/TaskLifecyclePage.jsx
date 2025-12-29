import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, Eye, X, CheckCircle, XCircle, Send, History, ChevronRight, AlertCircle, Upload, FileText, Paperclip } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

// Lifecycle phases in order
const LIFECYCLE_PHASES = [
    { key: 'requirement_refiner', label: 'Requirements', short: 'REQ' },
    { key: 'design_guidance', label: 'Design', short: 'DES' },
    { key: 'build_guidance', label: 'Build', short: 'BLD' },
    { key: 'acceptance_criteria', label: 'Acceptance', short: 'ACC' },
    { key: 'deployment', label: 'Deployment', short: 'DEP' },
    { key: 'closed', label: 'Closed', short: 'DONE' }
];

const getPhaseIndex = (phase) => LIFECYCLE_PHASES.findIndex(p => p.key === phase);
const getPhaseLabel = (phase) => LIFECYCLE_PHASES.find(p => p.key === phase)?.label || phase;

const TaskLifecyclePage = ({ userRole = 'employee', userId, addToast }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskHistory, setTaskHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Proof upload states
    const [showProofModal, setShowProofModal] = useState(false);
    const [taskForProof, setTaskForProof] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [userId, userRole]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let query = supabase.from('tasks').select('*').eq('assigned_to', user.id);
            const { data: tasksData, error } = await query;
            if (error) throw error;

            if (tasksData) {
                const formatted = tasksData.map(t => ({
                    ...t,
                    lifecycle_state: t.lifecycle_state || 'requirement_refiner',
                    sub_state: t.sub_state || 'in_progress'
                }));
                setTasks(formatted);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            addToast?.('Failed to load tasks', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchTaskHistory = async (taskId) => {
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_task_history', { p_task_id: taskId });
            if (error) throw error;
            setTaskHistory(data || []);
        } catch (error) {
            setTaskHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const openProofModal = (task) => {
        setTaskForProof(task);
        setProofFile(null);
        setUploadProgress(0);
        setShowProofModal(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                addToast?.('File size must be less than 10MB', 'error');
                return;
            }
            setProofFile(file);
        }
    };

    const uploadProofAndRequestValidation = async () => {
        if (!proofFile || !taskForProof) {
            addToast?.('Please select a file to upload', 'error');
            return;
        }

        setUploading(true);
        setUploadProgress(10);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const fileExt = proofFile.name.split('.').pop();
            const fileName = `${taskForProof.id}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            setUploadProgress(30);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('task-proofs')
                .upload(filePath, proofFile, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            setUploadProgress(70);

            const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(filePath);
            const proofUrl = urlData?.publicUrl || filePath;

            setUploadProgress(85);

            const { data, error } = await supabase.rpc('request_task_validation', {
                p_task_id: taskForProof.id,
                p_user_id: user.id,
                p_proof_url: proofUrl
            });

            if (error) throw error;

            setUploadProgress(100);

            if (data?.success) {
                addToast?.('Validation requested with proof!', 'success');
                setShowProofModal(false);
                setTaskForProof(null);
                setProofFile(null);
                fetchTasks();
            } else {
                addToast?.(data?.message || 'Failed to request validation', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            addToast?.('Failed to upload proof: ' + error.message, 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const getSubStateColor = (subState) => {
        switch (subState) {
            case 'in_progress': return { bg: '#dbeafe', text: '#1d4ed8' };
            case 'pending_validation': return { bg: '#fef3c7', text: '#b45309' };
            case 'approved': return { bg: '#dcfce7', text: '#166534' };
            case 'rejected': return { bg: '#fee2e2', text: '#991b1b' };
            default: return { bg: '#f3f4f6', text: '#6b7280' };
        }
    };

    const filteredTasks = tasks.filter(task => {
        const matchesStatus = filterStatus === 'All' ||
            (filterStatus === 'In Progress' && task.sub_state === 'in_progress') ||
            (filterStatus === 'Pending' && task.sub_state === 'pending_validation');
        const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const LifecycleProgress = ({ currentPhase, subState }) => {
        const currentIndex = getPhaseIndex(currentPhase);
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {LIFECYCLE_PHASES.slice(0, -1).map((phase, idx) => (
                    <React.Fragment key={phase.key}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 600,
                            backgroundColor: idx < currentIndex ? '#10b981' : idx === currentIndex ? (subState === 'pending_validation' ? '#f59e0b' : '#3b82f6') : '#e5e7eb',
                            color: idx <= currentIndex ? 'white' : '#9ca3af'
                        }} title={phase.label}>
                            {idx < currentIndex ? '✓' : phase.short.charAt(0)}
                        </div>
                        {idx < LIFECYCLE_PHASES.length - 2 && (
                            <div style={{ width: '16px', height: '3px', backgroundColor: idx < currentIndex ? '#10b981' : '#e5e7eb' }} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Your Tasks</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Track your tasks through the lifecycle</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ position: 'relative', minWidth: '200px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem' }} />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', backgroundColor: 'var(--background)' }}>
                    <option value="All">All</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending Validation</option>
                </select>
            </div>

            <div style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>TASK</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>LIFECYCLE</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>STATUS</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>DUE</th>
                            <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}>Loading...</td></tr>
                        ) : filteredTasks.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}>No tasks found.</td></tr>
                        ) : (
                            filteredTasks.map((task) => {
                                const subStateColor = getSubStateColor(task.sub_state);
                                return (
                                    <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px', fontWeight: 500 }}>
                                            {task.title}
                                            {task.proof_url && (
                                                <span style={{ marginLeft: '8px', color: '#10b981' }} title="Proof submitted">
                                                    <Paperclip size={14} />
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px' }}><LifecycleProgress currentPhase={task.lifecycle_state} subState={task.sub_state} /></td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: subStateColor.bg, color: subStateColor.text }}>
                                                {task.sub_state?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={14} /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                {task.sub_state === 'in_progress' && (
                                                    <button onClick={() => openProofModal(task)} disabled={actionLoading}
                                                        style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                                        <Upload size={14} /> Submit for Validation
                                                    </button>
                                                )}
                                                <button onClick={() => { setSelectedTask(task); setShowTaskModal(true); fetchTaskHistory(task.id); }}
                                                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                                    <Eye size={14} /> View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Proof Upload Modal */}
            {showProofModal && taskForProof && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: 'var(--surface)', padding: '32px', borderRadius: '20px', width: '500px', maxWidth: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ backgroundColor: '#ede9fe', borderRadius: '12px', padding: '12px' }}>
                                <Upload size={24} color="#8b5cf6" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Submit Proof for Validation</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{taskForProof.title}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <AlertCircle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '0.9rem', color: '#92400e' }}>
                                <strong>Proof Required:</strong> Upload documentation showing your completed work before requesting validation.
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                                Upload Proof Document
                            </label>
                            <div style={{
                                border: '2px dashed var(--border)',
                                borderRadius: '12px',
                                padding: '32px',
                                textAlign: 'center',
                                backgroundColor: proofFile ? '#f0fdf4' : 'var(--background)',
                                cursor: 'pointer'
                            }}
                                onClick={() => document.getElementById('proof-file-input').click()}
                            >
                                <input id="proof-file-input" type="file" onChange={handleFileChange} style={{ display: 'none' }}
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip,.txt" />
                                {proofFile ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                        <FileText size={32} color="#10b981" />
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#166534' }}>{proofFile.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{(proofFile.size / 1024).toFixed(1)} KB</div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={32} color="#9ca3af" style={{ marginBottom: '12px' }} />
                                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Click to upload</div>
                                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>PDF, DOC, PNG, JPG, ZIP (max 10MB)</div>
                                    </>
                                )}
                            </div>
                        </div>

                        {uploading && (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                    <span>Uploading...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#8b5cf6', transition: 'width 0.3s', borderRadius: '4px' }} />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => { setShowProofModal(false); setTaskForProof(null); setProofFile(null); }} disabled={uploading}
                                style={{ padding: '12px 24px', borderRadius: '10px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }}>
                                Cancel
                            </button>
                            <button onClick={uploadProofAndRequestValidation} disabled={!proofFile || uploading}
                                style={{
                                    padding: '12px 24px', borderRadius: '10px',
                                    background: proofFile ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : '#e5e7eb',
                                    color: proofFile ? 'white' : '#9ca3af', border: 'none', fontWeight: 600,
                                    cursor: proofFile ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    boxShadow: proofFile ? '0 4px 15px rgba(139, 92, 246, 0.3)' : 'none'
                                }}>
                                <Send size={16} />
                                {uploading ? 'Uploading...' : 'Submit for Validation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Details Modal */}
            {showTaskModal && selectedTask && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'var(--surface)', padding: '32px', borderRadius: '16px', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Task Details</h3>
                            <button onClick={() => setShowTaskModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>{selectedTask.title}</h4>
                            <p style={{ color: 'var(--text-secondary)' }}>{selectedTask.description || 'No description'}</p>
                        </div>

                        {selectedTask.proof_url && (
                            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <FileText size={24} color="#16a34a" />
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#166534' }}>Proof Submitted</div>
                                        <a href={selectedTask.proof_url} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontSize: '0.9rem' }}>
                                            View uploaded proof →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px' }}>LIFECYCLE PROGRESS</h4>
                            <LifecycleProgress currentPhase={selectedTask.lifecycle_state} subState={selectedTask.sub_state} />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><History size={16} /> STATE HISTORY</h4>
                            {historyLoading ? <p>Loading...</p> : taskHistory.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No transitions yet.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {taskHistory.map((entry, idx) => (
                                        <div key={idx} style={{ padding: '12px', backgroundColor: 'var(--background)', borderRadius: '8px', fontSize: '0.85rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 600 }}>{entry.action === 'approve' ? '✅ Approved' : entry.action === 'reject' ? '❌ Rejected' : '📤 Requested'}</span>
                                                <span style={{ color: 'var(--text-secondary)' }}>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</span>
                                            </div>
                                            <div style={{ color: 'var(--text-secondary)' }}>by {entry.actor_name}</div>
                                            {entry.comment && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>"{entry.comment}"</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            {selectedTask.sub_state === 'in_progress' && (
                                <button onClick={() => { setShowTaskModal(false); openProofModal(selectedTask); }} disabled={actionLoading}
                                    style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Upload size={16} /> Submit for Validation
                                </button>
                            )}
                            <button onClick={() => setShowTaskModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskLifecyclePage;
