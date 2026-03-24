import React from 'react';
import { AlertTriangle } from 'lucide-react';

const HandoverModal = ({ 
    selectedMemberForHandover, 
    projectRole, 
    onClose, 
    onConfirm 
}) => {
    if (!selectedMemberForHandover) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '32px',
                borderRadius: '24px',
                width: '480px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#b91c1c' }}>
                    <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: '#fef2f2' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Confirm Role Handover</h3>
                </div>

                <p style={{ color: '#4b5563', lineHeight: 1.6, marginTop: '8px' }}>
                    You are about to transfer your <strong>{projectRole === 'project_manager' ? 'Project Manager' : 'Team Lead'}</strong> role to <strong>{selectedMemberForHandover.name}</strong>.
                </p>

                <div style={{ backgroundColor: '#fffba0', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fde047', fontSize: '0.9rem', color: '#854d0e', display: 'flex', gap: '10px' }}>
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div>
                        <strong>Warning:</strong> You will lose your current administrative privileges for this project immediately after this action.
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: 'white',
                            color: '#374151',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        Confirm Handover
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HandoverModal;
