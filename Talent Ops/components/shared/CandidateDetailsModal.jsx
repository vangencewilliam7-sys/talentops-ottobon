import React from 'react';
import { X, Mail, Phone, MapPin, Calendar } from 'lucide-react';

const CandidateDetailsModal = ({ 
    selectedCandidate, 
    onClose,
    onScheduleInterview
}) => {
    if (!selectedCandidate) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="no-scrollbar" style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', width: '650px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Candidate Details</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Candidate Info */}
                <div style={{ padding: '32px' }}>
                    {/* Profile Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: '#b45309' }}>
                            {selectedCandidate.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px' }}>{selectedCandidate.name}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '8px' }}>Applied for: {selectedCandidate.role}</p>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    backgroundColor: '#e0f2fe',
                                    color: '#075985'
                                }}>
                                    {selectedCandidate.stage}
                                </span>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Score: <strong style={{ color: selectedCandidate.score > 80 ? 'var(--success)' : 'var(--warning)' }}>{selectedCandidate.score}%</strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div style={{ marginBottom: '32px' }}>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Contact Information</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Mail size={18} color="#b45309" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Email</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedCandidate.email}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Phone size={18} color="#b45309" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Phone</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedCandidate.phone}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MapPin size={18} color="#b45309" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Location</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedCandidate.location}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Calendar size={18} color="#b45309" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Applied Date</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedCandidate.appliedDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Qualifications */}
                    <div style={{ marginBottom: '32px' }}>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Qualifications</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ padding: '16px', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Experience</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedCandidate.experience}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Education</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedCandidate.education}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Expected Salary</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedCandidate.expectedSalary}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Availability</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedCandidate.availability}</p>
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    {selectedCandidate.skills && (
                        <div style={{ marginBottom: '32px' }}>
                            <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>Skills</h5>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {selectedCandidate.skills.map((skill, index) => (
                                    <span key={index} style={{ padding: '6px 16px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.875rem', fontWeight: 500 }}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Application Details */}
                    <div style={{ marginBottom: '24px' }}>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>Application Details</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            <div style={{ padding: '16px', backgroundColor: '#e0f2fe', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#075985', marginBottom: '4px', fontWeight: 600 }}>SOURCE</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#075985' }}>{selectedCandidate.source}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: '#dcfce7', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '4px', fontWeight: 600 }}>INTERVIEW SCORE</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#166534' }}>{selectedCandidate.score}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {selectedCandidate.notes && (
                        <div>
                            <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>Interview Notes</h5>
                            <div style={{ padding: '16px', backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{selectedCandidate.notes}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                        Close
                    </button>
                    <button
                        onClick={onScheduleInterview}
                        style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Schedule Interview
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CandidateDetailsModal;
