import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import './PayslipPreview.css';

// Helper function to convert number to words (Indian numbering system)
const numberToWords = (num) => {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertHundreds = (n) => {
        let str = '';
        if (n > 99) {
            str += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n > 19) {
            str += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        } else if (n >= 10) {
            str += teens[n - 10] + ' ';
            return str;
        }
        if (n > 0) {
            str += ones[n] + ' ';
        }
        return str;
    };

    let word = '';
    const crore = Math.floor(num / 10000000);
    if (crore > 0) {
        word += convertHundreds(crore) + 'Crore ';
        num %= 10000000;
    }

    const lakh = Math.floor(num / 100000);
    if (lakh > 0) {
        word += convertHundreds(lakh) + 'Lakh ';
        num %= 100000;
    }

    const thousand = Math.floor(num / 1000);
    if (thousand > 0) {
        word += convertHundreds(thousand) + 'Thousand ';
        num %= 1000;
    }

    if (num > 0) {
        word += convertHundreds(num);
    }

    return word.trim() + ' Rupees only';
};

const PayslipPreview = ({ payslipData, companySettings, onBack, onSave, loading }) => {
    const totalEarnings = payslipData.basicSalary + payslipData.hra + payslipData.allowances;
    const totalDeductions = (payslipData.professionalTax || 0) + payslipData.deductions + (payslipData.lopAmount || 0);
    const netSalary = payslipData.netSalary;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '24px',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                maxWidth: '1000px',
                width: '100%',
                maxHeight: '95vh',
                backgroundColor: '#f1f5f9',
                borderRadius: '32px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{
                    padding: '24px 40px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: 'white'
                }}>
                    <button
                        onClick={onBack}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1.5px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '14px',
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        <ArrowLeft size={18} />
                        Modify Details
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Document Finalization</h2>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Reviewing {payslipData.payslipNumber}</p>
                    </div>

                    <button
                        onClick={onSave}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: 'white',
                            fontWeight: 800,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                        <Save size={20} />
                        {loading ? 'Committing...' : 'Commit & Finalize'}
                    </button>
                </div>

                <div style={{
                    padding: '32px',
                    backgroundColor: '#fafaf9',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        margin: '0 auto',
                        maxWidth: '900px'
                    }}>
                        {/* Company Settings Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                            {companySettings?.logo_url ? (
                                <img src={companySettings.logo_url} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                            ) : (
                                <div style={{
                                    width: '32px', height: '32px', 
                                    borderRadius: '6px', border: '2px solid #1e293b', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: '800', fontSize: '1.2rem', color: '#1e293b'
                                }}>S</div>
                            )}
                            <div>
                                <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 4px 0', color: '#1e293b' }}>
                                    {companySettings?.company_name || 'Talent Ops'}
                                </h1>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Payroll (Preview)</p>
                            </div>
                        </div>

                        {/* Employee Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: '0 0 8px 0' }}>
                                    {payslipData.employeeName}
                                </h3>
                            </div>
                            <span style={{ 
                                color: '#64748b', fontSize: '0.7rem', fontWeight: '800', 
                                backgroundColor: '#f1f5f9', padding: '6px 12px', 
                                borderRadius: '16px', letterSpacing: '0.05em', border: '1px dashed #cbd5e1' 
                            }}>
                                PRE-COMMIT PREVIEW
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                Designation: <span style={{ fontWeight: '600', color: '#1e293b' }}>{payslipData.employeeRole || 'Employee'}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                Employee ID: <span style={{ fontWeight: '600', color: '#1e293b' }}>{payslipData.employeeId ? `EMP-${payslipData.employeeId.substring(0,4).toUpperCase()}` : 'N/A'}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                Month: <span style={{ fontWeight: '600', color: '#1e293b' }}>{payslipData.month}</span>
                            </div>
                        </div>

                        {/* Earnings, Adjustments and Deductions Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            
                            {/* Earnings Box */}
                            <div style={{ 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '8px', 
                                padding: '16px',
                                backgroundColor: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.8rem', fontWeight: '800', color: '#111827', letterSpacing: '0.05em' }}>EARNINGS</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: '6px' }}>
                                            <span>Basic Salary</span>
                                            <span style={{ fontWeight: '500' }}>₹{payslipData.basicSalary?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: '6px' }}>
                                            <span>HRA</span>
                                            <span style={{ fontWeight: '500' }}>₹{payslipData.hra?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151' }}>
                                            <span>Special Allowances</span>
                                            <span style={{ fontWeight: '500' }}>₹{payslipData.allowances?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#111827', fontSize: '0.9rem', fontWeight: '800' }}>Gross Earnings</span>
                                        <span style={{ color: '#111827', fontSize: '0.95rem', fontWeight: '800' }}>
                                            ₹{totalEarnings.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Adjustments Box */}
                            <div style={{ 
                                border: '1px solid #d1fae5', 
                                borderRadius: '8px', 
                                padding: '16px',
                                backgroundColor: '#f0fdf4',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.8rem', fontWeight: '800', color: '#065f46', letterSpacing: '0.05em' }}>BONUS & WAIVERS</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#059669' }}>
                                            <span>Waive Off Amount</span>
                                            <span style={{ fontWeight: '600' }}>₹{(payslipData.waiverCredit || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#065f46', fontSize: '0.9rem', fontWeight: '800' }}>Total Adjustment</span>
                                        <span style={{ color: '#059669', fontSize: '0.95rem', fontWeight: '800' }}>
                                            ₹{(payslipData.waiverCredit || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
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
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.8rem', fontWeight: '800', color: '#991b1b', letterSpacing: '0.05em' }}>DEDUCTIONS</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: '6px' }}>
                                            <span>Professional Tax</span>
                                            <span style={{ fontWeight: '500', color: '#dc2626' }}>-₹{(payslipData.professionalTax || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span>LOP ({payslipData.lopDays}d)</span>
                                            </div>
                                            <span style={{ fontWeight: '500', color: '#dc2626' }}>
                                                -₹{(payslipData.lopAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                            </span>
                                        </div>

                                        {(payslipData.deductions > 0) && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151' }}>
                                                <span>Other Deductions</span>
                                                <span style={{ fontWeight: '500', color: '#dc2626' }}>-₹{(payslipData.deductions || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#991b1b', fontSize: '0.9rem', fontWeight: '800' }}>Total Deds</span>
                                        <span style={{ color: '#dc2626', fontSize: '0.95rem', fontWeight: '800' }}>
                                            -₹{totalDeductions.toLocaleString('en-IN', {minimumFractionDigits: 2})}
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
                                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>Processing Cycle: {payslipData.month}</p>
                                <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: 'white' }}>Net Payable Salary</h4>
                                <p style={{ margin: '4px 0 0 0', color: '#6ee7b7', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                    In words: {numberToWords(Math.floor(netSalary))}
                                </p>
                            </div>
                            <div>
                                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#4ade80' }}>
                                    ₹{netSalary.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayslipPreview;
