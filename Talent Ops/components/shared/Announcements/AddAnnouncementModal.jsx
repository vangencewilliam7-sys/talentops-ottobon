import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Users, User, X } from 'lucide-react';

const AddAnnouncementModal = ({
    isOpen,
    onClose,
    initialCreateType = 'event',
    orgId,
    userRole,
    userTeamId,
    onSuccess
}) => {
    const [createType, setCreateType] = useState(initialCreateType);
    const [eventScope, setEventScope] = useState('all');
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        message: ''
    });

    const isAuthorized = ['executive', 'manager', 'team_lead', 'employee'].includes(userRole);

    useEffect(() => {
        setCreateType(initialCreateType);
    }, [initialCreateType]);

    useEffect(() => {
        const fetchOptions = async () => {
            if (!isAuthorized) return;
            setLoadingOptions(true);
            try {
                // Fetch Projects (teams)
                const { data: teams } = await supabase.from('projects').select('id, name').eq('org_id', orgId);
                if (teams) setAllTeams(teams.map(t => ({ id: t.id, name: t.name })));

                // Fetch Employees
                const { data: emps } = await supabase.from('profiles').select('id, full_name, team_id').eq('org_id', orgId);
                if (emps) setAllEmployees(emps.map(e => ({ id: e.id, name: e.full_name, teamId: e.team_id })));

            } catch (e) {
                console.error("Error fetching options", e);
            } finally {
                setLoadingOptions(false);
            }
        };

        if (isOpen) {
            fetchOptions();
        }
    }, [isOpen, isAuthorized, orgId]);

    const handleAddEvent = async (e) => {
        e.preventDefault();
        try {
            let finalDate = newEvent.date;
            let finalTime = newEvent.time;
            let finalLocation = newEvent.location;

            if (createType === 'announcement') {
                const today = new Date();
                finalDate = today.toISOString().split('T')[0];
                finalTime = today.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                finalLocation = 'Broadcast';
            }

            const payload = {
                p_org_id: orgId,
                p_title: newEvent.title,
                p_date: finalDate,
                p_time: finalTime,
                p_location: finalLocation,
                p_message: newEvent.message,
                p_event_for: eventScope === 'my_team' ? 'employee' : eventScope,
                p_target_teams: eventScope === 'team' ? selectedTeams : [],
                p_target_employees: (eventScope === 'employee' || eventScope === 'my_team') ? selectedEmployees : []
            };

            const { error } = await supabase.rpc('create_announcement_event', payload);

            if (error) throw error;

            if (onSuccess) onSuccess();
            onClose();
            setNewEvent({ title: '', date: '', time: '', location: '', message: '' });
            setEventScope('all');
            setSelectedTeams([]);
            setSelectedEmployees([]);

        } catch (err) {
            console.error("Error adding event:", err);
            alert("Failed to add event: " + err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
        }} onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'white',
                    borderRadius: '32px',
                    width: '520px',
                    maxWidth: '100%',
                    boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25)',
                    animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{ padding: '40px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{createType === 'announcement' ? 'New Announcement' : 'Add Event'}</h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', marginTop: '8px' }}>Share important updates with the team.</p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: '#f1f5f9', border: 'none', borderRadius: '12px',
                                width: '40px', height: '40px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#64748b'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Type Selector */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '6px', borderRadius: '16px', display: 'flex', gap: '4px', border: '1px solid #e2e8f0' }}>
                            <button
                                type="button"
                                onClick={() => setCreateType('event')}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
                                    backgroundColor: createType === 'event' ? '#0f172a' : 'transparent',
                                    color: createType === 'event' ? 'white' : '#64748b',
                                    fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                Event Invitation
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreateType('announcement')}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
                                    backgroundColor: createType === 'announcement' ? '#0f172a' : 'transparent',
                                    color: createType === 'announcement' ? 'white' : '#64748b',
                                    fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                Direct Announcement
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>
                                {createType === 'announcement' ? 'Headline' : 'Event Title'}
                            </label>
                            <input
                                type="text"
                                placeholder={createType === 'announcement' ? "e.g. Quarterly Review Meeting" : "e.g. Team Building Workshop"}
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                required
                                style={{ padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', width: "100%", background: '#f8fafc', fontWeight: '600', color: '#1e293b' }}
                            />
                        </div>

                        {/* Scope Selection */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>Target Audience</label>

                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {['executive', 'manager'].includes(userRole) ? (
                                    <>
                                        {[
                                            { id: 'all', label: 'All Employees', icon: Users },
                                            { id: 'team', label: 'Specific Projects', icon: User },
                                            { id: 'employee', label: 'Specific People', icon: User }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    setEventScope(opt.id);
                                                    setSelectedTeams([]);
                                                    setSelectedEmployees([]);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: eventScope === opt.id ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                                    backgroundColor: eventScope === opt.id ? '#3b82f608' : 'white',
                                                    color: eventScope === opt.id ? '#3b82f6' : '#64748b',
                                                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                <opt.icon size={16} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {[
                                            { id: 'my_team', label: 'My Project', icon: Users },
                                            { id: 'employee', label: 'All Employees', icon: User }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    setEventScope(opt.id);
                                                    setSelectedEmployees([]);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: eventScope === opt.id ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                                    backgroundColor: eventScope === opt.id ? '#3b82f608' : 'white',
                                                    color: eventScope === opt.id ? '#3b82f6' : '#64748b',
                                                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                <opt.icon size={16} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* Exec/Manager Specific Content */}
                            {['executive', 'manager'].includes(userRole) && (
                                <>
                                    {eventScope === 'team' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxHeight: '120px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px', background: '#f8fafc' }}>
                                            {allTeams.length > 0 ? allTeams.map(team => (
                                                <label key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTeams.includes(team.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedTeams([...selectedTeams, team.id]);
                                                            else setSelectedTeams(selectedTeams.filter(id => id !== team.id));
                                                        }}
                                                        style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                                                    />
                                                    {team.name}
                                                </label>
                                            )) : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No projects found</p>}
                                        </div>
                                    )}
                                    {eventScope === 'employee' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxHeight: '120px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px', background: '#f8fafc' }}>
                                            {allEmployees.length > 0 ? allEmployees.map(emp => (
                                                <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEmployees.includes(emp.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                                                            else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                                        }}
                                                        style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                                                    />
                                                    {emp.name}
                                                </label>
                                            )) : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No employees found</p>}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Team Lead / Employee Specific Content */}
                            {!['executive', 'manager'].includes(userRole) && (
                                <>
                                    {eventScope === 'my_team' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '800', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', color: '#0f172a' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        allEmployees.filter(e => e.teamId === userTeamId).length > 0 &&
                                                        selectedEmployees.length === allEmployees.filter(e => e.teamId === userTeamId).length
                                                    }
                                                    onChange={(e) => {
                                                        const myMembers = allEmployees.filter(e => e.teamId === userTeamId);
                                                        if (e.target.checked) setSelectedEmployees(myMembers.map(m => m.id));
                                                        else setSelectedEmployees([]);
                                                    }}
                                                    style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                                                />
                                                Select All
                                            </label>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginTop: '4px' }}>
                                                {allEmployees.filter(e => e.teamId === userTeamId).map(emp => (
                                                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEmployees.includes(emp.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                                                                else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                                            }}
                                                            style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                                                        />
                                                        {emp.name}
                                                    </label>
                                                ))}
                                            </div>
                                            {allEmployees.filter(e => e.teamId === userTeamId).length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No team members found</p>}
                                        </div>
                                    )}

                                    {eventScope === 'employee' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxHeight: '120px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px', background: '#f8fafc' }}>
                                            {allEmployees.length > 0 ? allEmployees.map(emp => (
                                                <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEmployees.includes(emp.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                                                            else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                                        }}
                                                        style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                                                    />
                                                    {emp.name}
                                                </label>
                                            )) : <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No employees found</p>}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {createType === 'event' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>Date</label>
                                    <input
                                        type="date"
                                        required={createType === 'event'}
                                        value={newEvent.date}
                                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                        style={{ padding: '14px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', width: "100%", fontWeight: '600' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>Time</label>
                                    <input
                                        type="time"
                                        required={createType === 'event'}
                                        value={newEvent.time}
                                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                        style={{ padding: '14px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', width: "100%", fontWeight: '600' }}
                                    />
                                </div>
                            </div>
                        )}

                        {createType === 'event' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>Location / Meeting Link</label>
                                <input
                                    type="text"
                                    placeholder="Physical location or digital workspace"
                                    required={createType === 'event'}
                                    value={newEvent.location}
                                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                    style={{ padding: '14px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', width: "100%", fontWeight: '600' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>Additional Context</label>
                            <textarea
                                placeholder="Add any specific details or instructions here..."
                                rows="3"
                                value={newEvent.message}
                                onChange={(e) => setNewEvent({ ...newEvent, message: e.target.value })}
                                style={{ padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', width: "100%", resize: 'none', fontWeight: '600', fontFamily: 'inherit' }}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                backgroundColor: '#0f172a',
                                color: '#fff',
                                padding: '16px',
                                borderRadius: '16px',
                                fontWeight: '900',
                                fontSize: '1rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                border: 'none',
                                cursor: 'pointer',
                                marginTop: '12px',
                                boxShadow: '0 15px 30px -5px rgba(15, 23, 42, 0.25)',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(15, 23, 42, 0.35)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            Publish {createType === 'announcement' ? 'Broadcast' : 'Event'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddAnnouncementModal;
