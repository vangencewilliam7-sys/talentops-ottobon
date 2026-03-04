import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Phone, MapPin, ZoomIn, ZoomOut, RotateCcw, Shield, Users, Briefcase, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const HierarchyDemo = () => {
    const [orgId, setOrgId] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [hierarchyData, setHierarchyData] = useState({
        executives: [],
        managers: [],
        teamLeads: [],
        employees: []
    });
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.4));
    const handleReset = () => {
        setScale(0.85);
        if (containerRef.current) {
            containerRef.current.scrollLeft = 0;
            containerRef.current.scrollTop = 0;
        }
    };

    // Fetch org_id from current user
    useEffect(() => {
        const fetchOrgId = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('org_id')
                        .eq('id', user.id)
                        .single();

                    if (profile?.org_id) {
                        setOrgId(profile.org_id);
                    }
                }
            } catch (error) {
                console.error('Error fetching org_id:', error);
            }
        };
        fetchOrgId();
    }, []);

    useEffect(() => {
        if (orgId) {
            fetchHierarchy();
        }
    }, [orgId]);

    const fetchHierarchy = async () => {
        try {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .eq('org_id', orgId)
                .order('full_name');

            if (profiles) {
                const getRole = (p) => p.role ? p.role.toLowerCase().trim() : '';

                const executives = profiles.filter(p => getRole(p) === 'executive');
                const managers = profiles.filter(p => getRole(p) === 'manager');
                const teamLeads = profiles.filter(p => getRole(p) === 'team_lead');
                const employees = profiles.filter(p => getRole(p) === 'employee');

                setHierarchyData({ executives, managers, teamLeads, employees });
            }
        } catch (error) {
            console.error("Error fetching hierarchy:", error);
        } finally {
            setLoading(false);
        }
    };

    // Measure canvas natural size to calculate spacer for scrollbars
    useEffect(() => {
        if (!canvasRef.current) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
            }
        });
        ro.observe(canvasRef.current);
        return () => ro.disconnect();
    }, [loading, hierarchyData]);

    const EmployeeNode = ({ data, color, roleLabel }) => (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                position: 'relative'
            }}
            onClick={() => setSelectedEmployee(data)}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
                const card = e.currentTarget.children[1];
                card.style.borderColor = color;
                card.style.boxShadow = `0 20px 40px -10px ${color}40`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                const card = e.currentTarget.children[1];
                card.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                card.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.05)';
            }}
        >
            {/* Role Chip */}
            <div style={{
                backgroundColor: color,
                color: 'white',
                padding: '4px 12px',
                borderRadius: '10px',
                fontSize: '0.6rem',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '-12px',
                zIndex: 2,
                boxShadow: `0 4px 12px ${color}40`
            }}>
                {roleLabel || data.role}
            </div>

            {/* Node Card */}
            <div style={{
                padding: '24px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '24px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                width: '240px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    backgroundColor: 'white',
                    padding: '4px',
                    boxShadow: `0 8px 16px -4px ${color}20`,
                    border: `1.5px solid ${color}20`
                }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f8fafc'
                    }}>
                        {data.avatar_url ? (
                            <img src={data.avatar_url} alt={data.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: color }}>{data.full_name?.charAt(0)}</span>
                        )}
                    </div>
                </div>

                <div>
                    <p style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                        {data.full_name || 'N/A'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {data.job_title || 'Workspace Member'}
                    </p>
                </div>
            </div>
        </div>
    );

    const LevelBadge = ({ color, label, icon: Icon }) => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '10px 20px',
            borderRadius: '16px',
            border: `1px solid ${color}20`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            marginBottom: '40px',
            backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: `${color}15`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </span>
        </div>
    );

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                <p style={{ fontWeight: '700', color: '#64748b' }}>Projecting Hierarchy...</p>
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // Compute spacer dimensions = canvas natural size × zoom scale
    const spacerW = canvasSize.w ? canvasSize.w * scale + 40 : '100%';
    const spacerH = canvasSize.h ? canvasSize.h * scale + 40 : '100%';

    return (
        <div style={{
            height: '100%',
            width: '100%',
            position: 'relative',
            backgroundColor: '#f8fafc',
            backgroundImage: `radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)`,
            backgroundSize: '40px 40px',
            overflow: 'hidden'
        }}>
            {/* Header — stays at top */}
            <div style={{ padding: '24px 24px 0 24px', zIndex: 10 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.04em', marginBottom: '8px' }}>
                    Org <span style={{ color: '#7c3aed' }}>Visualizer</span>
                </h1>
                <p style={{ color: '#64748b', fontWeight: '600', fontSize: '1rem' }}>Strategic workforce alignment and reporting lines.</p>
            </div>

            {/* Scroll area wrapper — fills remaining space */}
            <div style={{ position: 'absolute', top: '90px', left: 0, right: 0, bottom: 0 }}>
                {/* Scroll container — absolutely constrained, overflow: auto triggers scrollbars */}
                <div
                    className="premium-scrollbar"
                    ref={containerRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        overflow: 'auto'
                    }}
                >
                    {/* Spacer — forces scrollbar to appear by having explicit physical dimensions */}
                    <div style={{
                        width: spacerW,
                        height: spacerH,
                        minWidth: '100%',
                        minHeight: '100%',
                        position: 'relative'
                    }}>
                        {/* Canvas — uses transform: scale() for zoom (not CSS zoom) */}
                        <div
                            ref={canvasRef}
                            style={{
                                display: 'inline-block',
                                textAlign: 'center',
                                padding: '40px 100px 100px 100px',
                                transformOrigin: 'top left',
                                transform: `scale(${scale})`,
                                transition: 'transform 0.3s ease',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {(!hierarchyData.executives.length && !hierarchyData.managers.length && !hierarchyData.teamLeads.length && !hierarchyData.employees.length) ? (
                                <div style={{ padding: '60px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '400px', whiteSpace: 'normal' }}>
                                    <Users size={48} color="#cbd5e1" style={{ marginBottom: '20px' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Empty Hierarchy</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No organizational structure found.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'inline-block', textAlign: 'center', whiteSpace: 'normal' }}>
                                    {/* Level 1: Executives */}
                                    {hierarchyData.executives.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <LevelBadge color="#7c3aed" label="Executive Board" icon={Shield} />
                                            <div style={{ display: 'flex', gap: '48px', marginBottom: '80px' }}>
                                                {hierarchyData.executives.map(exec => (
                                                    <div key={exec.id} style={{ position: 'relative' }}>
                                                        <EmployeeNode data={exec} color="#7c3aed" roleLabel="Executive" />
                                                        <div style={{ position: 'absolute', bottom: '-40px', left: '50%', width: '2px', height: '40px', background: 'linear-gradient(to bottom, #7c3aed80, #cbd5e1)' }}></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Level 2: Managers */}
                                    {hierarchyData.managers.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                            <LevelBadge color="#2563eb" label="Operations Management" icon={Users} />
                                            {hierarchyData.managers.length > 1 && (
                                                <div style={{ position: 'absolute', top: '72px', left: '120px', right: '120px', height: '2px', backgroundColor: '#cbd5e1', zIndex: -1 }}></div>
                                            )}
                                            <div style={{ display: 'flex', gap: '48px', marginBottom: '80px' }}>
                                                {hierarchyData.managers.map(manager => (
                                                    <div key={manager.id} style={{ position: 'relative' }}>
                                                        <EmployeeNode data={manager} color="#2563eb" roleLabel="Manager" />
                                                        <div style={{ position: 'absolute', bottom: '-40px', left: '50%', width: '2px', height: '40px', backgroundColor: '#cbd5e1' }}></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Level 3: Team Leads & Employees */}
                                    {([...hierarchyData.teamLeads, ...hierarchyData.employees].length > 0) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                            <LevelBadge color="#10b981" label="Frontline & Leads" icon={Briefcase} />
                                            <div style={{ display: 'flex', gap: '48px', flexWrap: 'nowrap', padding: '0 40px' }}>
                                                {[...hierarchyData.teamLeads, ...hierarchyData.employees].map(item => (
                                                    <EmployeeNode
                                                        key={item.id}
                                                        data={item}
                                                        color={hierarchyData.teamLeads.includes(item) ? "#10b981" : "#64748b"}
                                                        roleLabel={hierarchyData.teamLeads.includes(item) ? "Team Lead" : "Employee"}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Stats Panel — fixed position */}
                <div style={{
                    position: 'fixed',
                    top: '100px',
                    right: '40px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    padding: '16px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    width: '220px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Org Overview</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { label: 'Leadership', count: hierarchyData.executives.length, color: '#7c3aed' },
                            { label: 'Management', count: hierarchyData.managers.length, color: '#2563eb' },
                            { label: 'Workforce', count: hierarchyData.teamLeads.length + hierarchyData.employees.length, color: '#10b981' }
                        ].map(stat => (
                            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>{stat.label}</span>
                                <span style={{ backgroundColor: `${stat.color}15`, color: stat.color, padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '800' }}>{stat.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Premium Zoom Controls — fixed at bottom center */}
                <div style={{
                    position: 'fixed',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    zIndex: 100,
                    color: 'white'
                }}>
                    <button onClick={handleZoomOut} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}><ZoomOut size={20} /></button>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: '20px' }}></div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', minWidth: '45px', textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: '20px' }}></div>
                    <button onClick={handleZoomIn} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}><ZoomIn size={20} /></button>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: '20px' }}></div>
                    <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}><RotateCcw size={18} /></button>
                </div>

                {/* Detailed Profile Modal */}
                {selectedEmployee && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '24px'
                    }} onClick={() => setSelectedEmployee(null)}>
                        <div style={{
                            backgroundColor: '#ffffff', width: '540px', borderRadius: '32px',
                            overflow: 'hidden', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.3)',
                            animation: 'modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ height: '160px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', position: 'relative' }}>
                                <button onClick={() => setSelectedEmployee(null)}
                                    style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={20} />
                                </button>
                                <div style={{ position: 'absolute', bottom: '-40px', left: '40px', width: '100px', height: '100px', borderRadius: '32px', backgroundColor: 'white', padding: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                                    <div style={{ width: '100%', height: '100%', borderRadius: '26px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                                        {selectedEmployee.avatar_url ? (
                                            <img src={selectedEmployee.avatar_url} alt={selectedEmployee.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: '800', color: '#64748b' }}>
                                                {selectedEmployee.full_name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '60px 40px 40px' }}>
                                <div style={{ marginBottom: '32px' }}>
                                    <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.4px' }}>{selectedEmployee.full_name}</h2>
                                    <p style={{ fontSize: '1rem', color: '#7c3aed', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedEmployee.job_title}</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
                                    {[
                                        { icon: Mail, label: 'Email Address', value: selectedEmployee.email },
                                        { icon: Phone, label: 'Contact Number', value: selectedEmployee.phone || 'N/A' },
                                        { icon: MapPin, label: 'Base Location', value: selectedEmployee.location || 'Remote' },
                                        { icon: Activity, label: 'Current Status', value: 'Active' }
                                    ].map((info, i) => (
                                        <div key={i} style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '8px' }}>
                                                <info.icon size={14} />
                                                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>{info.label}</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.value}</p>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setSelectedEmployee(null)}
                                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s ease' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e293b'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0f172a'}>
                                    Dismiss Portal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(40px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .premium-scrollbar {
                    scrollbar-width: auto;
                    scrollbar-color: #64748b #e2e8f0;
                }
                .premium-scrollbar::-webkit-scrollbar {
                    width: 12px;
                    height: 14px;
                }
                .premium-scrollbar::-webkit-scrollbar-track {
                    background: #e2e8f0;
                    border-radius: 0;
                }
                .premium-scrollbar::-webkit-scrollbar-thumb {
                    background: #94a3b8;
                    border-radius: 7px;
                    border: 2px solid #e2e8f0;
                }
                .premium-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                }
                .premium-scrollbar::-webkit-scrollbar-corner {
                    background: #e2e8f0;
                }
            `}</style>
            </div>
        </div>
    );
};

export default HierarchyDemo;
