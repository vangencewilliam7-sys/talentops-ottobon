import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import DataTable from '../employee/components/UI/DataTable';
import PayrollFormModal from './PayrollFormModal';
import { IndianRupee, Eye, X, FileText, MessageSquare } from 'lucide-react';

const PayrollPage = ({ userRole, userId, addToast, orgId }) => {
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Hierarchical Navigation State
    const [view, setView] = useState('years'); // 'years', 'months', 'records'
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);


    useEffect(() => {
        // Only fetch if orgId is available
        if (!orgId || orgId === 'null' || orgId === 'undefined') {
            setLoading(false);
            return;
        }

        fetchPayrolls();

        // Real-time subscription
        const subscription = supabase
            .channel('payroll-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'payroll',
                filter: `org_id=eq.${orgId}`
            }, () => {
                fetchPayrolls();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [orgId]); // Add orgId as dependency


    const fetchPayrolls = async () => {
        try {
            setLoading(true);

            let rpcName = isExecOrManager ? 'get_org_payroll_history' : 'get_my_payroll_history';

            console.log(`Fetching payrolls using RPC: ${rpcName} for org: ${orgId}`);

            const { data, error } = await supabase.rpc(rpcName);

            if (error) {
                console.error('Error fetching payrolls via RPC:', error);
                addToast('Failed to load payroll records: ' + error.message, 'error');
                setPayrolls([]);
                return;
            }

            const pData = data.data || data || [];
            setPayrolls(pData);

        } catch (error) {
            console.error('Unexpected error fetching payrolls:', error);
            addToast('Failed to load payroll records', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Build hierarchical mapping: { "2026": { "March": [...], "April": [...] }, "2025": { ... } }
    const hierarchy = React.useMemo(() => {
        const h = {};
        payrolls.forEach(p => {
            if (!p.month) return;
            const parts = p.month.split(' ');
            if (parts.length < 2) return;
            const monthName = parts[0];
            const yearStr = parts[1];

            if (!h[yearStr]) h[yearStr] = {};
            if (!h[yearStr][monthName]) h[yearStr][monthName] = [];
            h[yearStr][monthName].push(p);
        });
        return h;
    }, [payrolls]);

    // Role-based helper
    const isExecOrManager = ['Executive', 'Manager', 'executive', 'manager', 'admin'].includes(userRole);


    const handlePayrollSuccess = (message) => {
        addToast(message, 'success');
        fetchPayrolls();
    };

    const handleViewDetails = (payroll) => {
        setSelectedPayroll(payroll);
        setShowDetailsModal(true);
    };

    const columns = [
        {
            header: 'Employee',
            accessor: 'name',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        color: 'white'
                    }}>
                        {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, marginBottom: '2px' }}>{row.name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{row.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Month',
            accessor: 'month'
        },
        {
            header: 'Basic Salary',
            accessor: 'basic_salary',
            render: (row) => (
                <span style={{ fontWeight: 600 }}>
                    ₹{row.basic_salary?.toLocaleString()}
                </span>
            )
        },
        {
            header: 'LOP Days',
            accessor: 'lop_days',
            render: (row) => (
                <span style={{
                    color: row.lop_days > 0 ? '#dc2626' : '#059669',
                    fontWeight: 600
                }}>
                    {row.lop_days || 0}
                </span>
            )
        },
        {
            header: 'Net Salary',
            accessor: 'net_salary',
            render: (row) => (
                <span style={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#059669'
                }}>
                    ₹{row.net_salary?.toLocaleString()}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: row.status === 'generated' ? '#dcfce7' : '#fef3c7',
                    color: row.status === 'generated' ? '#166534' : '#b45309'
                }}>
                    {row.status?.charAt(0).toUpperCase() + row.status?.slice(1)}
                </span>
            )
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (row) => (
                <button
                    onClick={() => handleViewDetails(row)}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        backgroundColor: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                    }}
                >
                    <Eye size={16} />
                    View Details
                </button>
            )
        }
    ];

    // Only show Generate button for Executive and Manager roles
    const canGenerate = userRole === 'Executive' || userRole === 'Manager' || userRole === 'executive' || userRole === 'manager';

    console.log('PayrollPage - userRole:', userRole, 'canGenerate:', canGenerate);

    return (
        <div style={{
            padding: '32px',
            background: '#f8fafc',
            minHeight: '100vh'
        }}>
            {/* Premium Header - Reusing the Dashboard Aesthetic */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '8px',
                padding: '32px 40px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                marginBottom: '32px'
            }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="mesh-payroll" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#mesh-payroll)" />
                    </svg>
                </div>

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                            <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.1)' }}>Financials</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>•</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: '600' }}>Payroll Control</span>
                        </div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                            Payroll <span style={{ background: 'linear-gradient(to right, #818cf8, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Records</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: '600px', fontWeight: '500', lineHeight: 1.6 }}>
                            Comprehensive view of organizational payroll distribution and employee compensation records.
                        </p>
                    </div>

                    {canGenerate && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(12px)',
                            padding: '16px 24px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <button
                                onClick={() => setShowGenerateModal(true)}
                                style={{
                                    background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '6px',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                                }}
                            >
                                <IndianRupee size={20} />
                                Generate Payroll
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Drill-down Navigation */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                    <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>Synchronizing financial records...</p>
                </div>
            ) : payrolls.length === 0 ? (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                    <IndianRupee size={64} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>No Payroll Records Found</h3>
                    <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                        {canGenerate ? 'Initiate the first payroll cycle to begin tracking financial data.' : 'No payroll history available at this time.'}
                    </p>
                    {canGenerate && (
                        <button onClick={() => setShowGenerateModal(true)} style={{ padding: '12px 24px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <IndianRupee size={20} /> Generate Payroll
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                    {/* Breadcrumbs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                        <span
                            onClick={() => setView('years')}
                            style={{ cursor: 'pointer', color: view === 'years' ? '#6366f1' : 'inherit' }}
                        >
                            Payroll Root
                        </span>
                        {(view === 'months' || view === 'records') && (
                            <>
                                <span>/</span>
                                <span
                                    onClick={() => setView('months')}
                                    style={{ cursor: 'pointer', color: view === 'months' ? '#6366f1' : 'inherit' }}
                                >
                                    {selectedYear}
                                </span>
                            </>
                        )}
                        {view === 'records' && (
                            <>
                                <span>/</span>
                                <span style={{ color: '#6366f1' }}>{selectedMonth}</span>
                            </>
                        )}
                    </div>

                    {/* View Levels */}
                    {view === 'years' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                            {Object.keys(hierarchy).sort((a, b) => b - a).map(year => {
                                const totalRecords = Object.values(hierarchy[year]).reduce((acc, curr) => acc + curr.length, 0);
                                return (
                                    <div
                                        key={year}
                                        onClick={() => { setSelectedYear(year); setView('months'); }}
                                        style={{
                                            background: 'white',
                                            padding: '24px',
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.borderColor = '#6366f1';
                                            e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0, 0, 0, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>{year}</h3>
                                                <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '600' }}>{totalRecords} Cycles Recorded</p>
                                            </div>
                                            <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '12px', color: '#0369a1' }}>
                                                <IndianRupee size={24} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {view === 'months' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                            {Object.keys(hierarchy[selectedYear]).sort((a, b) => {
                                const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                return months.indexOf(a) - months.indexOf(b);
                            }).map(month => (
                                <div
                                    key={month}
                                    onClick={() => { setSelectedMonth(month); setView('records'); }}
                                    style={{
                                        background: 'white',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f8fafc';
                                        e.currentTarget.style.borderColor = '#6366f1';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'white';
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                >
                                    <span style={{ fontWeight: '700', color: '#334155' }}>{month}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px' }}>
                                        {hierarchy[selectedYear][month].length} Records
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {view === 'records' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
                                <button
                                    onClick={() => setView('months')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#6366f1',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    &larr; Back to {selectedYear} Months
                                </button>
                            </div>
                            <DataTable
                                title={`Payroll Detail: ${selectedMonth} ${selectedYear}`}
                                columns={columns}
                                data={hierarchy[selectedYear][selectedMonth]}
                            />
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>


            {/* Generate Payroll Modal */}
            {showGenerateModal && (
                <PayrollFormModal
                    isOpen={showGenerateModal}
                    onClose={() => setShowGenerateModal(false)}
                    onSuccess={handlePayrollSuccess}
                    orgId={orgId}
                />
            )}

            {/* Payroll Details Modal */}
            {showDetailsModal && selectedPayroll && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(10, 10, 11, 0.4)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setShowDetailsModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '0',
                            maxWidth: '750px',
                            width: '95%',
                            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '20px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: 'white'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Fake Logo Placeholder for STARTECH INC equivalent */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '28px', height: '28px',
                                        borderRadius: '6px', border: '2px solid #1e293b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: '800', fontSize: '1rem', color: '#1e293b'
                                    }}>S</div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.05em' }}>Talent Ops</span>
                                </div>
                                <div style={{ height: '20px', width: '2px', backgroundColor: '#e2e8f0' }} />
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2563eb', margin: 0 }}>
                                    Payroll
                                </h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    onClick={() => window.print()}
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        color: '#334155',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px'
                                    }}
                                >
                                    <X size={24} strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ padding: '32px', backgroundColor: '#fafaf9' }}>
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                padding: '24px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                                {/* Employee Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: '0 0 8px 0' }}>
                                            {selectedPayroll.name}
                                        </h3>
                                    </div>
                                    <span style={{
                                        color: '#64748b', fontSize: '0.7rem', fontWeight: '800',
                                        backgroundColor: '#f1f5f9', padding: '6px 12px',
                                        borderRadius: '16px', letterSpacing: '0.05em', border: '1px dashed #cbd5e1'
                                    }}>
                                        OFFICIAL RECORD
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                        Designation: <span style={{ fontWeight: '600', color: '#1e293b' }}>{selectedPayroll.designation || selectedPayroll.role || 'Employee'}</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                        Employee ID: <span style={{ fontWeight: '600', color: '#1e293b' }}>EMP-{selectedPayroll.employee_id ? selectedPayroll.employee_id.substring(0, 4).toUpperCase() : '0000'}</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                        Month: <span style={{ fontWeight: '600', color: '#1e293b' }}>{selectedPayroll.month}</span>
                                    </div>
                                </div>

                                {/* Earnings, Bonus and Deductions Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '20px', marginBottom: '20px' }}>

                                    {/* Earnings Box */}
                                    <div style={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        backgroundColor: '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', fontWeight: '800', color: '#111827', letterSpacing: '0.05em' }}>EARNINGS</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#374151', marginBottom: '8px' }}>
                                                    <span>Basic Salary</span>
                                                    <span style={{ fontWeight: '500' }}>₹{selectedPayroll.basic_salary?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#374151', marginBottom: '8px' }}>
                                                    <span>HRA</span>
                                                    <span style={{ fontWeight: '500' }}>₹{selectedPayroll.hra?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#374151' }}>
                                                    <span>Special Allowances</span>
                                                    <span style={{ fontWeight: '500' }}>₹{selectedPayroll.allowances?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#111827', fontSize: '0.95rem', fontWeight: '800' }}>Gross Earnings</span>
                                                <span style={{ color: '#111827', fontSize: '1rem', fontWeight: '800' }}>
                                                    ₹{((selectedPayroll.basic_salary || 0) + (selectedPayroll.hra || 0) + (selectedPayroll.allowances || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bonus & Adjustments Box */}
                                    <div style={{
                                        border: '1px solid #bbf7d0',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        backgroundColor: '#f0fdf4',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', fontWeight: '800', color: '#166534', letterSpacing: '0.05em' }}>BONUS & WAIVERS</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#166534' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>Waived Off Amount</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#15803d', opacity: 0.8 }}>Attendance & LOP waivers</span>
                                                </div>
                                                <span style={{ fontWeight: '800' }}>
                                                    +₹{((() => {
                                                        const gross = (selectedPayroll.basic_salary || 0) + (selectedPayroll.hra || 0) + (selectedPayroll.allowances || 0);
                                                        const monthStr = selectedPayroll.month || "";
                                                        const daysInMonth = monthStr.includes("April") || monthStr.includes("June") || monthStr.includes("September") || monthStr.includes("November") ? 30 : monthStr.includes("February") ? 28 : 31;
                                                        const dailyRate = Math.round(gross / daysInMonth);
                                                        const actualLopAmount = (selectedPayroll.lop_days || 0) * dailyRate;
                                                        const expectedNet = gross - (selectedPayroll.professional_tax || 0) - actualLopAmount - (selectedPayroll.deductions || 0);
                                                        const impliedBonus = selectedPayroll.net_salary - expectedNet;
                                                        return selectedPayroll.bonus || (impliedBonus > 0 ? impliedBonus : 0);
                                                    })()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deductions Box */}
                                    <div style={{
                                        border: '1px solid #fecaca',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        backgroundColor: '#fffdfd',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', fontWeight: '800', color: '#111827', letterSpacing: '0.05em' }}>DEDUCTIONS</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#374151', marginBottom: '8px' }}>
                                                    <span>Professional Tax</span>
                                                    <span style={{ fontWeight: '500', color: '#dc2626' }}>-₹{(selectedPayroll.professional_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#374151', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span>Loss of Pay (LOP)</span>
                                                        {(selectedPayroll.lop_days > 0) && (
                                                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                                                                ({selectedPayroll.lop_days} days LOP)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontWeight: '500', color: '#dc2626' }}>
                                                        -₹{( (() => {
                                                            const gross = (selectedPayroll.basic_salary || 0) + (selectedPayroll.hra || 0) + (selectedPayroll.allowances || 0);
                                                            const monthStr = selectedPayroll.month || "";
                                                            const daysInMonth = monthStr.includes("April") || monthStr.includes("June") || monthStr.includes("September") || monthStr.includes("November") ? 30 : monthStr.includes("February") ? 28 : 31;
                                                            const dailyRate = Math.round(gross / daysInMonth);
                                                            return (selectedPayroll.lop_days || 0) * dailyRate;
                                                        })() ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                {(selectedPayroll.deductions > 0) && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#374151' }}>
                                                        <span>Additional Deductions</span>
                                                        <span style={{ fontWeight: '500', color: '#dc2626' }}>-₹{(selectedPayroll.deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#111827', fontSize: '0.95rem', fontWeight: '800' }}>Total Deductions</span>
                                                <span style={{ color: '#dc2626', fontSize: '1rem', fontWeight: '800' }}>
                                                    -₹{( (() => {
                                                        const gross = (selectedPayroll.basic_salary || 0) + (selectedPayroll.hra || 0) + (selectedPayroll.allowances || 0);
                                                        const monthStr = selectedPayroll.month || "";
                                                        const daysInMonth = monthStr.includes("April") || monthStr.includes("June") || monthStr.includes("September") || monthStr.includes("November") ? 30 : monthStr.includes("February") ? 28 : 31;
                                                        const dailyRate = Math.round(gross / daysInMonth);
                                                        const actualLopAmount = (selectedPayroll.lop_days || 0) * dailyRate;
                                                        return actualLopAmount + (selectedPayroll.professional_tax || 0) + (selectedPayroll.deductions || 0);
                                                    })() ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Salary Footer Box */}
                                <div style={{
                                    background: '#111827',
                                    borderRadius: '12px',
                                    padding: '24px 32px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: 'white',
                                    marginTop: '20px'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>Processing Cycle: {selectedPayroll.month}</p>
                                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: 'white' }}>Net Payable Salary</h4>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#4ade80' }}>
                                            ₹{selectedPayroll.net_salary?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: '16px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                    Generated on {selectedPayroll.created_at ? new Date(selectedPayroll.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollPage;
