import React, { useState } from 'react';
import { X, Briefcase, Calendar, CheckCircle, Target, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';

const APPLIER_RESPONSIBILITIES = [
    "Complete high-priority current tasks",
    "Handover pending tasks to a teammate",
    "Update status/progress on all active tasks",
    "Ensure relevant documentation is accessible"
];

const ApplyLeaveModal = ({ onClose, onSuccess, remainingLeaves }) => {
    const { addToast } = useToast();
    const { orgId } = useUser();

    const [leaveFormData, setLeaveFormData] = useState({
        leaveType: remainingLeaves <= 0 ? 'Loss of Pay' : 'Casual Leave',
        startDate: '',
        endDate: '',
        reason: ''
    });
    
    // Multiple discrete dates approach
    const [selectedDates, setSelectedDates] = useState([]);
    const [dateToAdd, setDateToAdd] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const addSelectedDate = (date) => {
        if (!date) return;
        setSelectedDates(prev => {
            const set = new Set(prev);
            if (set.has(date)) return prev;
            set.add(date);
            return Array.from(set).sort();
        });
    };

    const removeSelectedDate = (date) => {
        setSelectedDates(prev => prev.filter(d => d !== date));
    };

    // Calculate LOP vs Paid breakdown
    const calculateBreakdown = () => {
        const useSpecificDates = selectedDates.length > 0;
        let totalDays = 0;
        
        if (useSpecificDates) {
            totalDays = selectedDates.length;
        } else if (leaveFormData.startDate && leaveFormData.endDate) {
            // Simple weekday calculation (re-implementing here for local sync)
            const start = new Date(leaveFormData.startDate);
            const end = new Date(leaveFormData.endDate);
            let count = 0;
            const cur = new Date(start);
            while (cur <= end) {
                const day = cur.getDay();
                if (day !== 0 && day !== 6) count++;
                cur.setDate(cur.getDate() + 1);
            }
            totalDays = count;
        }

        const paid = Math.min(totalDays, remainingLeaves);
        const lop = Math.max(0, totalDays - paid);
        
        return { total: totalDays, paid, lop };
    };

    const breakdown = calculateBreakdown();

    const handleApplyLeave = async (e) => {
        e.preventDefault();

        const useSpecificDates = selectedDates.length > 0;
        const datesToApply = useSpecificDates
            ? Array.from(new Set(selectedDates)).sort()
            : [];

        if (useSpecificDates && datesToApply.length === 0) {
            addToast('Please select at least one leave date.', 'error');
            return;
        }

        if (!useSpecificDates && (!leaveFormData.startDate || !leaveFormData.endDate || leaveFormData.endDate < leaveFormData.startDate)) {
            addToast('End date must be the same or after the start date.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Determine if this is a Loss of Pay request based on the breakdown
            const finalType = breakdown.lop > 0 && breakdown.paid === 0 ? 'Loss of Pay' : leaveFormData.leaveType;
            
            const leaveReason = `${finalType}: ${leaveFormData.reason}` +
                (useSpecificDates ? ` (Dates: ${datesToApply.join(', ')})` : '');

            // For multi-day requests, we store the aggregate in one row usually, 
            // but if specific dates are used, it's one row per date.
            const leaveRows = useSpecificDates
                ? datesToApply.map(date => ({
                    employee_id: user.id,
                    org_id: orgId,
                    from_date: date,
                    to_date: date,
                    reason: leaveReason,
                    status: 'pending',
                    // Attribution for single date: if quota > 0, it's paid. 
                    // This is handled by the loop if we want more precision, 
                    // but for "1/month" it's simpler.
                    lop_days: 0 // Will handle via simpler logic below for consistency
                }))
                : [{
                    employee_id: user.id,
                    org_id: orgId,
                    from_date: leaveFormData.startDate,
                    to_date: leaveFormData.endDate,
                    reason: leaveReason,
                    status: 'pending',
                    duration_weekdays: breakdown.total,
                    lop_days: breakdown.lop
                }];
            
            // Adjust attribution for specific dates
            if (useSpecificDates) {
                let tempPaidLeft = remainingLeaves;
                leaveRows.forEach(row => {
                    if (tempPaidLeft > 0) {
                        row.lop_days = 0;
                        tempPaidLeft--;
                    } else {
                        row.lop_days = 1;
                    }
                });
            }

            const { data, error } = await supabase
                .from('leaves')
                .insert(leaveRows)
                .select();

            if (error) throw error;

            addToast('Leave application submitted successfully', 'success');
            onSuccess(data);
            onClose();
        } catch (error) {
            console.error('Error applying for leave:', error);
            addToast('Failed to submit leave request: ' + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="no-scrollbar" style={{ backgroundColor: 'var(--surface)', padding: '40px', borderRadius: '32px', width: '1000px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--background)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 10 }}
                >
                    <X size={20} />
                </button>

                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '8px' }}>Request Leave</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '500' }}>Submit your leave details for approval</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px' }}>
                    <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Type</label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={leaveFormData.leaveType}
                                    onChange={(e) => setLeaveFormData({ ...leaveFormData, leaveType: e.target.value })}
                                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', backgroundColor: 'var(--background)', color: 'var(--text-primary)', transition: 'all 0.2s', outline: 'none', appearance: 'none' }}
                                    required
                                    disabled={remainingLeaves <= 0}
                                >
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Vacation">Vacation</option>
                                    <option value="Personal Leave">Personal Leave</option>
                                    <option value="Loss of Pay">Loss of Pay</option>
                                </select>
                                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                                    <Briefcase size={18} />
                                </div>
                            </div>
                            {remainingLeaves <= 0 && (
                                <p style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '8px', fontWeight: 600 }}>0 paid leaves remaining. Only Loss of Pay is available.</p>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discrete Dates (Optional)</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input
                                    type="date"
                                    value={dateToAdd}
                                    onChange={(e) => setDateToAdd(e.target.value)}
                                    style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', backgroundColor: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                                    disabled={leaveFormData.startDate !== '' && leaveFormData.endDate !== ''}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (dateToAdd) {
                                            addSelectedDate(dateToAdd);
                                            setDateToAdd('');
                                        }
                                    }}
                                    disabled={!dateToAdd || (leaveFormData.startDate !== '' && leaveFormData.endDate !== '')}
                                    style={{ padding: '0 20px', borderRadius: '12px', backgroundColor: 'var(--surface-active)', color: 'var(--primary)', border: '1px solid var(--border)', fontWeight: 700, cursor: (dateToAdd && (leaveFormData.startDate === '' && leaveFormData.endDate === '')) ? 'pointer' : 'not-allowed', opacity: (dateToAdd && (leaveFormData.startDate === '' && leaveFormData.endDate === '')) ? 1 : 0.5 }}
                                >
                                    Add Date
                                </button>
                            </div>
                            {selectedDates.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    {selectedDates.map(d => (
                                        <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                            <span>{new Date(d).toLocaleDateString()}</span>
                                            <X size={14} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => removeSelectedDate(d)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>Use this if you need specific days off rather than a range.</p>
                        </div>

                        {selectedDates.length === 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</label>
                                    <input
                                        type="date"
                                        value={leaveFormData.startDate}
                                        onChange={(e) => {
                                            const nextStart = e.target.value;
                                            setLeaveFormData(prev => ({
                                                ...prev,
                                                startDate: nextStart,
                                                endDate: prev.endDate && prev.endDate >= nextStart ? prev.endDate : nextStart
                                            }));
                                        }}
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', backgroundColor: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                                        required={selectedDates.length === 0}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</label>
                                    <input
                                        type="date"
                                        value={leaveFormData.endDate}
                                        onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                                        min={leaveFormData.startDate}
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', backgroundColor: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                                        required={selectedDates.length === 0}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detailed Reason</label>
                            <textarea
                                value={leaveFormData.reason}
                                onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                                rows="4"
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', backgroundColor: 'var(--background)', color: 'var(--text-primary)', transition: 'all 0.2s', outline: 'none', resize: 'vertical' }}
                                placeholder="Please provide specific details..."
                                required
                            />
                        </div>

                        <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#0f172a' }}>
                                <Target size={18} />
                                <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Applier Responsibilities</h4>
                            </div>
                            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {APPLIER_RESPONSIBILITIES.map((resp, index) => (
                                    <li key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
                                        <div style={{ marginTop: '2px', color: '#10b981' }}><CheckCircle size={16} /></div>
                                        <span>{resp}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{ padding: '14px 28px', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ padding: '14px 32px', borderRadius: '12px', fontWeight: '800', fontSize: '1.05rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>

                    <div style={{ padding: '32px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} color="#0284c7" /> Your Balance
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Paid Leaves Available</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7' }}>{remainingLeaves}</span>
                                </div>
                            </div>
                        </div>

                        {breakdown.total > 0 && (
                            <div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={18} color="#f59e0b" /> Request Summary
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Total Working Days</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{breakdown.total}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#166534' }}>Paid Duration</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534' }}>{breakdown.paid} Day{breakdown.paid !== 1 ? 's' : ''}</span>
                                    </div>
                                    {breakdown.lop > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#991b1b' }}>Loss of Pay (LOP)</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>{breakdown.lop} Day{breakdown.lop !== 1 ? 's' : ''}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplyLeaveModal;
