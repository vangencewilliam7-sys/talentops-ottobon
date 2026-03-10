import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, UploadCloud, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import * as XLSX from 'xlsx';

const OrganizationHolidaysCard = ({ userRole }) => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedHolidays, setSelectedHolidays] = useState([]);

    // Only allow managers, HR, and executives to see the upload UI.
    // Employees will only see the list.
    const canManage = userRole ? ['executive', 'hr', 'manager'].includes(userRole) : false;

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
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON (array of arrays to handle no headers properly)
                const jsonArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonArray.length === 0) {
                    throw new Error('No valid data found in the file.');
                }

                const parsedHolidays = [];

                // Check if first row is headers
                let startIndex = 0;
                if (jsonArray[0].length > 0 && String(jsonArray[0][0]).toLowerCase().includes('date')) {
                    startIndex = 1;
                }

                for (let i = startIndex; i < jsonArray.length; i++) {
                    const row = jsonArray[i];
                    // Skip empty rows completely
                    if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
                        continue;
                    }

                    if (row.length >= 2) {
                        // Excel sometimes returns serial dates, or just string text formats.
                        // We must handle both.
                        let dateStr = row[0];
                        const name = String(row[1]).trim();
                        const type = row.length > 2 ? String(row[2]).trim() : 'company';

                        // Handle Excel Serial Date
                        if (typeof dateStr === 'number') {
                            const jsDate = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                            dateStr = jsDate.toISOString().split('T')[0];
                        } else {
                            dateStr = String(dateStr).trim();
                        }

                        // Flexible Date Parsing for Text strings
                        let formattedDateStr = "";
                        const cleanDateStr = dateStr.replace(/[\/\.]/g, '-');

                        const yyyyMmDd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
                        const ddMmYyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

                        let parts;
                        if ((parts = cleanDateStr.match(yyyyMmDd))) {
                            const y = parts[1], m = parts[2].padStart(2, '0'), d = parts[3].padStart(2, '0');
                            formattedDateStr = `${y}-${m}-${d}`;
                        } else if ((parts = cleanDateStr.match(ddMmYyyy))) {
                            let p1 = parseInt(parts[1], 10), p2 = parseInt(parts[2], 10), y = parts[3];
                            let d, m;
                            if (p2 > 12) { m = p1; d = p2; } // Must be MM-DD-YYYY
                            else if (p1 > 12) { d = p1; m = p2; } // Must be DD-MM-YYYY
                            else { d = p1; m = p2; } // Ambiguous: Defaulting to DD-MM-YYYY
                            formattedDateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                        } else {
                            // Try JS Date parser as a fallback
                            const jsDate = new Date(dateStr);
                            if (!isNaN(jsDate.getTime())) {
                                formattedDateStr = jsDate.toISOString().split('T')[0];
                            }
                        }

                        if (!formattedDateStr || isNaN(new Date(formattedDateStr).getTime())) {
                            throw new Error(`Invalid date format on row ${i + 1} ("${dateStr}"). Try YYYY-MM-DD or DD/MM/YYYY.`);
                        }

                        parsedHolidays.push({
                            holiday_date: formattedDateStr,
                            holiday_name: name,
                            holiday_type: type || 'company'
                        });
                    }
                }

                if (parsedHolidays.length === 0) {
                    throw new Error('No valid holidays found in the file.');
                }

                // Call the Bulk Insert RPC
                const { data: dbData, error } = await supabase.rpc('rpc_setup_organization_holidays', {
                    p_holidays: parsedHolidays
                });

                if (error) throw error;
                if (!dbData.success) throw new Error(dbData.message);

                setMessage({ type: 'success', text: dbData.message });
                fetchHolidays(); // Refresh the list

            } catch (error) {
                console.error('Error parsing/uploading File:', error);
                setMessage({ type: 'error', text: error.message });
            } finally {
                setUploading(false);
                event.target.value = ''; // Reset input
            }
        };

        reader.readAsArrayBuffer(file);
    };



    const handleBulkDelete = async () => {
        if (selectedHolidays.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedHolidays.length} selected holidays?`)) return;

        try {
            const { error } = await supabase
                .from('organization_holidays')
                .delete()
                .in('id', selectedHolidays);

            if (error) throw error;
            setMessage({ type: 'success', text: `Successfully removed ${selectedHolidays.length} holidays.` });
            setSelectedHolidays([]); // Clear selection
            fetchHolidays();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete selected holidays.' });
        }
    };

    const toggleSelectAll = () => {
        if (selectedHolidays.length === holidays.length) {
            // Deselect all
            setSelectedHolidays([]);
        } else {
            // Select all
            setSelectedHolidays(holidays.map(h => h.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedHolidays(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CalendarIcon size={24} color="var(--primary)" />
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Organization Holidays</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Manage company-wide holidays that affect leave balance and attendance.
                        </p>
                    </div>
                </div>

                {canManage && selectedHolidays.length > 0 && (
                    <button
                        onClick={handleBulkDelete}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            border: '1px solid #f87171',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Trash2 size={16} /> Delete Selected ({selectedHolidays.length})
                    </button>
                )}
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
                        accept=".csv, .xlsx, .xls"
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
                        {uploading ? 'Processing File...' : 'To upload new holidays, drag & drop an Excel (.xlsx) or CSV file here'}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Format required: Date, Holiday Name, Type (public/company)
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
                                    {canManage && (
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={holidays.length > 0 && selectedHolidays.length === holidays.length}
                                                onChange={toggleSelectAll}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </th>
                                    )}
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Date</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Holiday Name</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.map((holiday) => (
                                    <tr key={holiday.id} style={{
                                        borderBottom: '1px solid var(--border)',
                                        backgroundColor: selectedHolidays.includes(holiday.id) ? 'var(--background)' : 'transparent'
                                    }}>
                                        {canManage && (
                                            <td style={{ padding: '12px 16px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedHolidays.includes(holiday.id)}
                                                    onChange={() => toggleSelect(holiday.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                        )}
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
