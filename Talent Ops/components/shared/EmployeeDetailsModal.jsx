import React from 'react';
import { X, Mail, Phone, MapPin, Calendar } from 'lucide-react';

const EmployeeDetailsModal = ({ 
    selectedEmployee, 
    onClose 
}) => {
    if (!selectedEmployee) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="no-scrollbar" style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Employee Details</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Employee Info */}
                <div style={{ padding: '32px' }}>
                    {/* Profile Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: '#075985', overflow: 'hidden' }}>
                            {selectedEmployee.avatar_url ? (
                                <img src={selectedEmployee.avatar_url} alt={selectedEmployee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                selectedEmployee.name.charAt(0)
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px' }}>{selectedEmployee.name}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '8px', textTransform: 'capitalize' }}>
                                {selectedEmployee.job_title || selectedEmployee.role}
                            </p>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: selectedEmployee.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                color: selectedEmployee.status === 'Active' ? '#166534' : '#991b1b'
                            }}>
                                {selectedEmployee.status}
                            </span>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div style={{ marginBottom: '32px' }}>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Contact Information</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Mail size={18} color="#075985" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Email</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedEmployee.email}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Phone size={18} color="#075985" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Phone</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedEmployee.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MapPin size={18} color="#075985" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Location</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedEmployee.location || 'N/A'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Calendar size={18} color="#075985" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Join Date</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedEmployee.joinDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Work Information */}
                    <div style={{ marginBottom: '32px' }}>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Work Information</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ padding: '16px', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedEmployee.department_display || 'Unassigned'}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Manager</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedEmployee.manager || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Financial Details */}
                    <div style={{ marginBottom: '32px' }}>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Financial Details</h5>
                        
                        {(
                            selectedEmployee.employment_type?.toLowerCase() === 'intern' || 
                            selectedEmployee.job_title?.toLowerCase() === 'intern' || 
                            selectedEmployee.role?.toLowerCase() === 'intern'
                        ) ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                {(selectedEmployee.is_paid === false || (selectedEmployee.stipend === 0 && selectedEmployee.is_paid !== true)) ? (
                                    <div style={{ padding: '24px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2', textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.9rem', color: '#991b1b', marginBottom: '4px', fontWeight: 600 }}>INTERNSHIP STATUS</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b' }}>UNPAID INTERN</p>
                                        <p style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '8px' }}>This intern is not receiving any compensation.</p>
                                    </div>
                                ) : (
                                    <div style={{ padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontSize: '0.9rem', color: '#166534', marginBottom: '4px', fontWeight: 600 }}>MONTHLY STIPEND</p>
                                            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#166534' }}>
                                                ₹{selectedEmployee.stipend ? selectedEmployee.stipend.toLocaleString('en-IN') : '0'}
                                            </p>
                                        </div>
                                        <div style={{ padding: '8px 16px', backgroundColor: '#166534', color: 'white', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                                            PAID INTERN
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#075985', marginBottom: '4px', fontWeight: 600 }}>Basic Salary</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#075985' }}>
                                        ₹{selectedEmployee.basic_salary ? selectedEmployee.basic_salary.toLocaleString('en-IN') : '0'}
                                    </p>
                                </div>
                                <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '4px', fontWeight: 600 }}>HRA</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>
                                        ₹{selectedEmployee.hra ? selectedEmployee.hra.toLocaleString('en-IN') : '0'}
                                    </p>
                                </div>
                                <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '12px', border: '1px solid #fef08a' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#b45309', marginBottom: '4px', fontWeight: 600 }}>Allowances</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b45309' }}>
                                        ₹{selectedEmployee.allowances ? selectedEmployee.allowances.toLocaleString('en-IN') : '0'}
                                    </p>
                                </div>
                                <div style={{ padding: '16px', backgroundColor: '#ede9fe', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#6d28d9', marginBottom: '4px', fontWeight: 600 }}>Gross Salary</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6d28d9' }}>
                                        ₹{selectedEmployee.gross_salary ? selectedEmployee.gross_salary.toLocaleString('en-IN') : '0'}
                                    </p>
                                </div>
                                <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '4px', fontWeight: 600 }}>Professional Tax (Deduction)</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b' }}>
                                        -₹{selectedEmployee.professional_tax ? selectedEmployee.professional_tax.toLocaleString('en-IN') : '0'}
                                    </p>
                                </div>
                                <div style={{ padding: '16px', backgroundColor: '#d1fae5', borderRadius: '12px', border: '2px solid #10b981' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#065f46', marginBottom: '4px', fontWeight: 600 }}>Net Salary</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#065f46' }}>
                                        ₹{((selectedEmployee.gross_salary || 0) - (selectedEmployee.professional_tax || 0)).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Performance Metrics */}
                    <div>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Performance Metrics</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div style={{ padding: '16px', backgroundColor: '#dcfce7', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '4px', fontWeight: 600 }}>PERFORMANCE</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>{selectedEmployee.performance || 'N/A'}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: '#e0f2fe', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#075985', marginBottom: '4px', fontWeight: 600 }}>PROJECTS</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#075985' }}>{selectedEmployee.projects || 0}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#b45309', marginBottom: '4px', fontWeight: 600 }}>TASKS DONE</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b45309' }}>{selectedEmployee.tasksCompleted || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetailsModal;
