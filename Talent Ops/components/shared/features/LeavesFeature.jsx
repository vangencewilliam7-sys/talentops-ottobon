import React from 'react';
import DataTable from '../../manager/components/UI/DataTable';
import { Eye, Edit, Trash2 } from 'lucide-react';

const LeavesFeature = ({ leaves, type, title, onAction, userId, projectRole }) => {
    let columns = [];
    let dataToDisplay = leaves;

    if (type === 'leaves') {
        // Manager / Exec Approval view OR Employee personal view if employee's ModulePage uses 'leaves' for personal
        // To distinguish, if it's manager view, they can approve/reject.
        // We handle this via projectRole or just let onAction handle the row data.
        columns = [
            { header: 'Employee', accessor: 'name' },
            { header: 'Type', accessor: 'type' },
            { header: 'Duration', accessor: 'duration' },
            { header: 'Dates', accessor: 'dates' },
            {
                header: 'Status', accessor: 'status', render: (row) => (
                    <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: row.status === 'Approved' ? '#dcfce7' : row.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                        color: row.status === 'Approved' ? '#166534' : row.status === 'Pending' ? '#b45309' : '#991b1b'
                    }}>
                        {row.status}
                    </span>
                )
            },
            {
                header: 'Actions', accessor: 'actions', render: (row) => {
                    // Manager / Admin approving others
                    if (row.status === 'Pending' && row.employee_id !== userId && (projectRole === 'manager' || projectRole === 'executive' || projectRole === 'team_lead')) {
                        return (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => onAction('View Leave', row)} style={btnStyle('#e0f2fe', '#075985', '#7dd3fc', '#bae6fd')}>
                                    <Eye size={14} /> View
                                </button>
                                <button onClick={() => onAction('Approve', row)} style={btnStyle('#dcfce7', '#166534', '#86efac', '#bbf7d0')}>
                                    Approve
                                </button>
                                <button onClick={() => onAction('Reject', row)} style={btnStyle('#fee2e2', '#991b1b', '#fca5a5', '#fecaca')}>
                                    Reject
                                </button>
                            </div>
                        );
                    } 
                    // Employee's pending leave
                    else if (row.status === 'Pending' && row.employee_id === userId) {
                        return (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => onAction('View Leave', row)} style={btnStyle('#e0f2fe', '#075985', '#7dd3fc', '#bae6fd')}>
                                    <Eye size={14} /> View
                                </button>
                                <button onClick={() => onAction('Delete Leave', row)} style={btnStyle('#fee2e2', '#991b1b', '#fca5a5', '#fecaca')}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        );
                    }
                    // Resolved leave
                    else {
                        return (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => onAction('View Leave', row)} style={btnStyle('#e0f2fe', '#075985', '#7dd3fc', '#bae6fd')}>
                                    <Eye size={14} /> View
                                </button>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>-</span>
                            </div>
                        );
                    }
                }
            }
        ];
    } else if (type === 'employee-leave-info') {
        columns = [
            { header: 'Employee', accessor: 'name' },
            { header: 'Total Leaves Taken', accessor: 'total_taken' },
            { header: 'Paid Leaves', accessor: 'paid_leaves' },
            { header: 'Loss of Pay Days', accessor: 'lop_days' },
            { header: 'Leaves Left', accessor: 'leaves_left' }
        ];
    } else if (type === 'my-leaves') {
        columns = [
            { header: 'Type', accessor: 'type' },
            { header: 'Duration', accessor: 'duration' },
            { header: 'Dates', accessor: 'dates' },
            {
                header: 'Status', accessor: 'status', render: (row) => (
                    <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: row.status === 'Approved' ? '#dcfce7' : row.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                        color: row.status === 'Approved' ? '#166534' : row.status === 'Pending' ? '#b45309' : '#991b1b'
                    }}>
                        {row.status}
                    </span>
                )
            },
            {
                header: 'Actions', accessor: 'actions', render: (row) => {
                    if (row.status === 'Pending') {
                        return (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => onAction('View Leave', row)} style={btnStyle('#e0f2fe', '#075985', '#7dd3fc', '#bae6fd')}>
                                    <Eye size={14} /> View
                                </button>
                                <button onClick={() => onAction('Delete Leave', row)} style={btnStyle('#fee2e2', '#991b1b', '#fca5a5', '#fecaca')}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        );
                    } else {
                        return (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => onAction('View Leave', row)} style={btnStyle('#e0f2fe', '#075985', '#7dd3fc', '#bae6fd')}>
                                    <Eye size={14} /> View
                                </button>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>-</span>
                            </div>
                        );
                    }
                }
            }
        ];
    }

    return (
        <DataTable
            title={`${title} List`}
            columns={columns}
            data={dataToDisplay}
            onAction={onAction}
        />
    );
};

// Helper for inline button styles to support hover via CSS alternative or basic fallback
const btnStyle = (bg, color, border, hoverBg) => ({
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: bg,
    color: color,
    border: `1px solid ${border}`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s'
});

export default LeavesFeature;
