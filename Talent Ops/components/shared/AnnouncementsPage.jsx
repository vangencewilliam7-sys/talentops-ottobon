import React, { useEffect, useState } from 'react';
import { Calendar, Archive, AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { useAnnouncements } from './hooks/useAnnouncements';
import { useUser } from './context/UserContext';
import ViewAnnouncementModal from './Announcements/ViewAnnouncementModal';
import AddAnnouncementModal from './Announcements/AddAnnouncementModal';

const AnnouncementsPage = ({ 
    userRole: propUserRole, 
    userId: propUserId, 
    orgId: propOrgId 
}) => {
    // Consume context as fallback for missing props
    const { 
        userId: contextUserId, 
        orgId: contextOrgId, 
        userRole: contextUserRole 
    } = useUser();

    // Prioritize props over context
    const userId = propUserId || contextUserId;
    const orgId = propOrgId || contextOrgId;
    const userRole = (propUserRole || contextUserRole || '').toLowerCase();

    const { 
        announcements, 
        loading, 
        userTeamId, 
        refetchAnnouncements, 
        updateAnnouncementStatus, 
        deleteAnnouncement 
    } = useAnnouncements(userId, orgId);

    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Status Tab State
    const [activeTab, setActiveTab] = useState('active'); // 'active', 'upcoming', 'completed'

    // Add Event State
    const [showAddModal, setShowAddModal] = useState(false);

    // View Mode State
    const [viewMode, setViewMode] = useState('announcements'); // 'events' | 'announcements' | 'holidays'
    const [createType, setCreateType] = useState('event'); // 'event' | 'announcement'

    const isAuthorized = ['executive', 'manager', 'team_lead', 'employee'].includes(userRole);
    const canManageEvents = ['executive', 'manager'].includes(userRole); // Only them can edit status
    const canMarkCompleted = isAuthorized; // All roles can mark as completed

    // Filter Logic based on View Mode & Active Tab
    useEffect(() => {
        if (!announcements) return;

        const now = new Date();

        let filtered = [];

        if (viewMode === 'announcements') {
            // ANNOUNCEMENTS MODE
            filtered = announcements.filter(item => {
                if (item.event_for === 'all' && item.location === 'Broadcast') {
                    // It fits announcement profile
                } else if (item.location === 'Broadcast') {
                    // It fits
                } else {
                    if (item.location !== 'Broadcast') return false;
                }

                // 24 Hour Expiration
                const dateTimeStr = `${item.event_date}T${item.event_time}`;
                const itemTime = new Date(dateTimeStr);

                if (isNaN(itemTime.getTime())) return false;

                const diffHours = (now - itemTime) / (1000 * 60 * 60);
                return diffHours <= 24 && diffHours >= 0; 
            });

            // Sort by newest
            filtered.sort((a, b) => {
                const dateA = new Date(`${a.event_date}T${a.event_time}`);
                const dateB = new Date(`${b.event_date}T${b.event_time}`);
                return dateB - dateA;
            });

        } else if (viewMode === 'holidays') {
            // HOLIDAYS MODE
            filtered = announcements.filter(item => item.isHoliday);

            // Sort by Date ascending (next upcoming first)
            filtered.sort((a, b) => {
                const dateA = new Date(a.event_date);
                const dateB = new Date(b.event_date);
                return dateA - dateB;
            });
        } else {
            // EVENTS MODE
            filtered = announcements.filter(event => {
                // Must NOT be an announcement (Location != Broadcast)
                if (event.location === 'Broadcast') return false;

                const effectiveStatus = event.status;

                if (activeTab === 'upcoming') return effectiveStatus === 'future';
                if (activeTab === 'active') return effectiveStatus === 'active';
                if (activeTab === 'completed') return effectiveStatus === 'completed';
                return false;
            });

            filtered.sort((a, b) => {
                const dateA = new Date(`${a.event_date}T${a.event_time}`);
                const dateB = new Date(`${b.event_date}T${b.event_time}`);
                return activeTab === 'completed' ? dateB - dateA : dateA - dateB;
            });
        }

        setFilteredAnnouncements(filtered);
    }, [announcements, activeTab, viewMode]);

    if (loading && announcements.length === 0) {
        return (
            <div style={{
                height: '60vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '24px', color: '#64748b'
            }}>
                <div style={{
                    width: '40px', height: '40px', border: '3px solid #f1f5f9',
                    borderTop: '3px solid #0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ fontWeight: '600', fontSize: '1rem', letterSpacing: '0.02em' }}>Fetching the latest updates...</p>
                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    @keyframes modalSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Compact Header */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '8px', padding: '20px 28px', color: 'white',
                position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                marginBottom: '20px'
            }}>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboard</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>/</span>
                            <span style={{ color: '#22d3ee', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Announcements</span>
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                            Announcements & Events
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: '400' }}>
                            Stay informed with the latest organizational news, upcoming events, and important broadcasts.
                        </p>
                    </div>

                    {isAuthorized && (
                        <button
                            onClick={() => {
                                setCreateType(viewMode === 'announcements' ? 'announcement' : 'event');
                                setShowAddModal(true);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white',
                                padding: '10px 20px', borderRadius: '6px', fontWeight: '600', fontSize: '0.85rem',
                                border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                                transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                            }}
                        >
                            <Plus size={16} />
                            {viewMode === 'announcements' ? 'Post Announcement' : 'Add Event'}
                        </button>
                    )}
                </div>
            </div>

            {/* Toggles and Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'white', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    {['events', 'announcements', 'holidays'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{
                                padding: '8px 20px', borderRadius: '6px', border: 'none',
                                backgroundColor: viewMode === mode ? (mode === 'holidays' ? '#f97316' : '#0f172a') : 'transparent',
                                color: viewMode === mode ? 'white' : '#64748b',
                                fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {mode === 'events' ? 'Events / Calendar' : mode === 'holidays' ? 'Holidays' : 'Announcements'}
                        </button>
                    ))}
                </div>

                {viewMode === 'events' && <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>}

                {viewMode === 'events' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                            { id: 'active', label: 'Active Now', icon: CheckCircle2, color: '#10b981' },
                            { id: 'upcoming', label: 'Future', icon: Calendar, color: '#3b82f6' },
                            { id: 'completed', label: 'Completed', icon: Archive, color: '#64748b' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px',
                                    border: activeTab === tab.id ? `1px solid ${tab.color}30` : '1px solid transparent',
                                    backgroundColor: activeTab === tab.id ? `${tab.color}08` : 'transparent',
                                    color: activeTab === tab.id ? tab.color : '#64748b',
                                    fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s'
                                }}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: tab.color }}></div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {filteredAnnouncements.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1', padding: '80px 40px', textAlign: 'center', backgroundColor: 'white',
                        borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '350px'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#f8fafc',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
                        }}>
                            <AlertCircle size={32} color="#94a3b8" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                                {viewMode === 'holidays' ? 'No Upcoming Holidays' : viewMode === 'announcements' ? 'No Announcements' : `No ${activeTab} events`}
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                                {viewMode === 'holidays' ? 'There are no organization holidays scheduled at this time.' : viewMode === 'announcements' ? 'There are no current announcements.' : activeTab === 'active' ? 'Everything is quiet today. No events are currently happening.' :
                                    activeTab === 'upcoming' ? 'Your calendar is clear. Check back later for new scheduled events.' : 'No completed events found in the history.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    filteredAnnouncements.map(event => (
                        <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            style={{
                                backgroundColor: 'white', borderRadius: '8px', padding: '32px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9',
                                display: 'flex', flexDirection: 'column', gap: '20px', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer', position: 'relative', overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-6px)';
                                e.currentTarget.style.boxShadow = '0 25px 30px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.02), 0 4px 6px -2px rgba(0, 0, 0, 0.01)';
                                e.currentTarget.style.borderColor = '#f1f5f9';
                            }}
                        >
                            <div style={{
                                position: 'absolute', left: 0, top: '32px', bottom: '32px', width: '4px', borderRadius: '0 4px 4px 0',
                                backgroundColor: viewMode === 'announcements' ? '#f59e0b' : viewMode === 'holidays' ? '#f97316' : activeTab === 'active' ? '#10b981' : activeTab === 'upcoming' ? '#3b82f6' : '#cbd5e1'
                            }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em',
                                            backgroundColor: viewMode === 'announcements' ? '#f59e0b15' : viewMode === 'holidays' ? '#f9731615' : activeTab === 'active' ? '#10b98115' : activeTab === 'upcoming' ? '#3b82f615' : '#f1f5f9',
                                            color: viewMode === 'announcements' ? '#f59e0b' : viewMode === 'holidays' ? '#f97316' : activeTab === 'active' ? '#10b981' : activeTab === 'upcoming' ? '#3b82f6' : '#64748b',
                                        }}>
                                            {viewMode === 'announcements' ? 'Broadcast' : viewMode === 'holidays' ? 'Holiday' : activeTab === 'active' ? 'Active now' : activeTab === 'upcoming' ? 'Scheduled' : 'Past Event'}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{event.title}</h3>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Date</span>
                                    <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>
                                        {new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Time</span>
                                    <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>{event.event_time}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Location</span>
                                    <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>{event.location}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedEvent && (
                <ViewAnnouncementModal
                    selectedEvent={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    viewMode={viewMode}
                    activeTab={activeTab}
                    canManageEvents={canManageEvents}
                    canMarkCompleted={canMarkCompleted}
                    onDelete={deleteAnnouncement}
                    onUpdateStatus={updateAnnouncementStatus}
                    orgId={orgId}
                />
            )}

            {showAddModal && (
                <AddAnnouncementModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    initialCreateType={createType}
                    orgId={orgId}
                    userRole={userRole}
                    userTeamId={userTeamId}
                    onSuccess={() => refetchAnnouncements()}
                />
            )}
        </div>
    );
};

export default AnnouncementsPage;
