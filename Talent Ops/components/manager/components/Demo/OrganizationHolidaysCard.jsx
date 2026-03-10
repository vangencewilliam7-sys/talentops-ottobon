import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, UploadCloud, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';

const OrganizationHolidaysCard = ({ userRole }) => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // In the true app, we check if role is one of the admin roles.
    // For demo/testing purposes, if userRole is undefined, we default to true so it can be tested.
    const canManage = userRole ? ['executive', 'hr', 'admin', 'super_admin', 'manager'].includes(userRole) : true;

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            setLoading(true);

            // To fetch, we can just query the table. The RLS policy allows anyone in the org to read.
            // But we first need to ensure the user is part of an org via RLS.
            const { data, error } = await supabase
                .from('organization_holidays')
                .select('*')
                .order('holiday_date', { ascending: true });

            if (error) throw error;
            setHolidays(data || []);
        } catch (error) {
            console.error('Error fetching holidays:', error);
            setMessage({ type: 'error', text: 'Failed to load holidays.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        setMessage({ type: '', text: '' });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');

                // Assuming simple CSV format: "Date,Name,Type"
                // Example: 2026-01-26,Republic Day,public
                // Skip header if it exists (check if first row has letters instead of numbers)
                let startIndex = 0;
                if (lines[0].toLowerCase().includes('date')) {
                    startIndex = 1;
                }

                const parsedHolidays = [];

                for (let i = startIndex; i < lines.length; i++) {
                    const row = lines[i].split(',').map(s => s.trim());
                    if (row.length >= 2) {
                        const [dateStr, name, type] = row;

                        // Basic validation for YYYY-MM-DD
                        if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            throw new Error(`Invalid date format on line ${i + 1}. Expected YYYY-MM-DD.`);
                        }

                        parsedHolidays.push({
                            holiday_date: dateStr,
                            holiday_name: name,
                            holiday_type: type || 'company'
                        });
                    }
                }

                if (parsedHolidays.length === 0) {
                    throw new Error('No valid holidays found in the file.');
                }

                // Call the Bulk Insert RPC
                const { data, error } = await supabase.rpc('rpc_setup_organization_holidays', {
                    p_holidays: parsedHolidays
                });

                if (error) throw error;
                if (!data.success) throw new Error(data.message);

                setMessage({ type: 'success', text: data.message });
                fetchHolidays(); // Refresh the list

            } catch (error) {
                console.error('Error parsing/uploading CSV:', error);
                setMessage({ type: 'error', text: error.message });
            } finally {
                setUploading(false);
                event.target.value = ''; // Reset input
            }
        };

        reader.readAsText(file);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this holiday?")) return;

        try {
            const { error } = await supabase
                .from('organization_holidays')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Holiday removed successfully.' });
            fetchHolidays();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete holiday.' });
        }
    };

    return (
        <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border)',
            marginTop: '24px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <CalendarIcon size={24} color="var(--primary)" />
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Organization Holidays</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Manage company-wide holidays that affect leave balance and attendance.
                    </p>
                </div>
            </div>

            {/* Message Area */}
            {message.text && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            {/* Upload Area */}
            {canManage && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 24px',
                    border: '2px dashed var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--background)',
                    marginBottom: '24px',
                    position: 'relative',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                }}>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer'
                        }}
                    />
                    <UploadCloud size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
                    <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {uploading ? 'Processing CSV...' : 'To upload new holidays, drag & drop a CSV here'}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Format required: YYYY-MM-DD, Holiday Name, public/company
                    </p>
                </div>
            )}

            {/* Display List */}
            <div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                        Loading holidays...
                    </div>
                ) : holidays.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No holidays found for this organization.</p>
                    </div>
                ) : (
                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: 'var(--background)' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Date</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Holiday Name</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Type</th>
                                    {canManage && <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.map((holiday) => (
                                    <tr key={holiday.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '0.95rem' }}>
                                            {new Date(holiday.holiday_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.95rem' }}>{holiday.holiday_name}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                backgroundColor: holiday.holiday_type === 'public' ? '#eff6ff' : '#f0fdf4',
                                                color: holiday.holiday_type === 'public' ? '#1d4ed8' : '#15803d',
                                                fontWeight: 600,
                                                textTransform: 'capitalize'
                                            }}>
                                                {holiday.holiday_type}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleDelete(holiday.id)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                    title="Remove Holiday"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizationHolidaysCard;
