import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../../../lib/supabaseClient';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatusDemo = () => {
    const { userName, userStatus, userTask, lastActive, userId, orgId } = useUser();

    // Mock Status Data for the List
    const statusData = [
        { name: userName, dept: 'Engineering', availability: userStatus, task: userTask || 'No active task', lastActive: lastActive }
    ];

    const getMonthStart = (d) => {
        const date = new Date(d);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const [currentMonthStart, setCurrentMonthStart] = useState(getMonthStart(new Date()));
    const [stats, setStats] = useState({
        avgHours: '0h',
        peakDay: '—',
        arrival: '—',
        streak: '0 Days'
    });
    const [monthlyData, setMonthlyData] = useState([]);
    const [joinDate, setJoinDate] = useState(null);
    const [loading, setLoading] = useState(false);

    const handlePrevMonth = () => {
        const newDate = new Date(currentMonthStart);
        newDate.setMonth(currentMonthStart.getMonth() - 1);
        setCurrentMonthStart(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentMonthStart);
        newDate.setMonth(currentMonthStart.getMonth() + 1);
        setCurrentMonthStart(newDate);
    };

    // Helper: Get all dates in a range
    const getDatesInRange = (startDate, endDate) => {
        const date = new Date(startDate.getTime());
        const dates = [];
        while (date <= endDate) {
            dates.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return dates;
    };

    useEffect(() => {
        const fetchJoinDate = async () => {
            if (!userId) return;
            const { data } = await supabase.from('profiles').select('join_date').eq('id', userId).single();
            if (data?.join_date) setJoinDate(new Date(data.join_date));
        };
        fetchJoinDate();
    }, [userId]);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);

            // 1. Helper: Robust Local Date & Time Parsing
            const formatDate = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const parseTime = (dateStr, timeVal) => {
                if (!timeVal) return null;
                try {
                    let t = String(timeVal).trim();
                    if (t.includes('+')) t = t.split('+')[0];
                    if (t.includes('T') || t.includes('-')) return new Date(t.replace(' ', 'T'));
                    
                    if (t.split(':').length === 2) t += ':00';
                    const d = new Date(`${dateStr}T${t}`);
                    return isNaN(d.getTime()) ? null : d;
                } catch (e) { return null; }
            };

            try {
                // 2. Define Query Range (Selected Month +/- 5 days for boundary safety)
                const monthStart = new Date(currentMonthStart);
                const monthEnd = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0);
                
                const fetchStart = new Date(monthStart);
                fetchStart.setDate(fetchStart.getDate() - 5);
                const fetchEnd = new Date(monthEnd);
                fetchEnd.setDate(fetchEnd.getDate() + 5);

                const startStr = formatDate(fetchStart);
                const endStr = formatDate(fetchEnd);
                const todayStr = formatDate(new Date());

                // 3. Parallel Data Fetching
                const [attRes, leavesRes] = await Promise.all([
                    supabase.from('attendance').select('*').eq('employee_id', userId).gte('date', startStr).lte('date', endStr).order('date', { ascending: true }),
                    supabase.from('leaves').select('*').eq('employee_id', userId).or(`from_date.gte.${startStr},to_date.lte.${endStr}`)
                ]);

                if (attRes.error) console.error('Attendance Fetch Error:', attRes.error);

                let attendance = attRes.data || [];
                const leaves = leavesRes.data || [];

                // 4. Self-Healing: Auto-close stale sessions from previous days
                const staleRecords = attendance.filter(a => String(a.date) < todayStr && !(a.check_out || a.clock_out));
                if (staleRecords.length > 0) {
                    await Promise.all(staleRecords.map(async (record) => {
                        const inTime = record.check_in || record.clock_in;
                        const start = parseTime(record.date, inTime);
                        if (!start) return;

                        const end = new Date(`${record.date}T23:59:00`);
                        const hours = Math.max(0, (end - start) / (1000 * 60 * 60));

                        await supabase.from('attendance').update({
                            check_out: '23:59:00',
                            clock_out: '23:59:00',
                            total_hours: hours.toFixed(2),
                            status: 'present'
                        }).eq('id', record.id);
                    }));

                    // Local refresh after healing
                    const { data: refreshed } = await supabase.from('attendance').select('*').eq('employee_id', userId).gte('date', startStr).lte('date', endStr);
                    if (refreshed) attendance = refreshed;
                }

                // 5. Build Monthly Visualization Dataset
                const processDay = (date) => {
                    const dateISO = formatDate(date);
                    const dayRecords = attendance.filter(a => String(a.date) === dateISO);
                    const leave = leaves.find(l => dateISO >= l.from_date && dateISO <= l.to_date);

                    let dayTotalHours = 0;
                    let isActiveNow = false;
                    let firstClockIn = null;

                    dayRecords.forEach(att => {
                        const inVal = att.check_in || att.clock_in;
                        const outVal = att.check_out || att.clock_out;
                        const hoursStored = att.total_hours || att.total_duration || att.hours;

                        if (inVal && (!firstClockIn || String(inVal) < firstClockIn)) {
                            firstClockIn = String(inVal).includes('T') ? String(inVal).split('T')[1].split('+')[0] : String(inVal);
                        }

                        const start = parseTime(dateISO, inVal);
                        if (start) {
                            if (outVal) {
                                const end = parseTime(dateISO, outVal);
                                if (end && end > start) {
                                    dayTotalHours += (end - start) / (1000 * 60 * 60);
                                } else if (hoursStored) {
                                    dayTotalHours += parseFloat(hoursStored) || 0;
                                }
                            } else {
                                // Live Session Calculation
                                const now = (dateISO === todayStr) ? new Date() : new Date(`${dateISO}T23:59:00`);
                                const diff = (now - start) / (1000 * 60 * 60);
                                if (diff > 0) {
                                    dayTotalHours += diff;
                                    if (dateISO === todayStr) isActiveNow = true;
                                }
                            }
                        }
                    });

                    let displayStatus = 'Absent';
                    const comparisonDate = new Date();
                    comparisonDate.setHours(0,0,0,0);

                    if (date > comparisonDate) displayStatus = 'Upcoming';
                    else if (joinDate && date < joinDate) displayStatus = 'Not Joined';
                    else if (dayRecords.length > 0) {
                        displayStatus = isActiveNow ? 'Active Now' : (dayRecords.some(r => !(r.check_out || r.clock_out) && String(r.date) !== todayStr) ? 'Auto-closing...' : 'Present');
                    } else if (leave) displayStatus = 'On Leave';

                    return {
                        dateStr: dateISO,
                        hours: Number(dayTotalHours.toFixed(2)) || 0,
                        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                        dayNum: date.getDate(),
                        tooltipStatus: displayStatus,
                        firstClockIn
                    };
                };

                const currentMonthDates = getDatesInRange(monthStart, monthEnd);
                const visualData = currentMonthDates.map(d => processDay(d));
                setMonthlyData(visualData);

                // 6. Final Statistics Aggregation
                const activeWorkedDays = visualData.filter(d => d.hours > 0);
                const totalHoursSum = activeWorkedDays.reduce((acc, curr) => acc + curr.hours, 0);
                const peakItem = [...visualData].sort((a,b) => b.hours - a.hours)[0];

                // Average Arrival Time
                let avgArrivalStr = '—';
                const arrivalMinutes = activeWorkedDays.filter(d => d.firstClockIn).map(d => {
                    const parts = d.firstClockIn.split(':');
                    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
                });
                if (arrivalMinutes.length > 0) {
                    const avgMins = arrivalMinutes.reduce((a,b) => a+b, 0) / arrivalMinutes.length;
                    avgArrivalStr = `${Math.floor(avgMins/60).toString().padStart(2,'0')}:${Math.floor(avgMins%60).toString().padStart(2,'0')}`;
                }

                // Streak - Using unified attendance pool for efficiency
                let streakCount = 0;
                const distinctWorkedDates = Array.from(new Set(attendance.map(d => String(d.date))));
                let streakDate = new Date();
                if (!distinctWorkedDates.includes(formatDate(streakDate))) streakDate.setDate(streakDate.getDate() - 1);

                for(let i=0; i<45; i++) {
                    const ds = formatDate(streakDate);
                    if(streakDate.getDay() === 0 || streakDate.getDay() === 6) { streakDate.setDate(streakDate.getDate() - 1); continue; }
                    if(distinctWorkedDates.some(ud => ud.includes(ds))) { streakCount++; streakDate.setDate(streakDate.getDate() - 1); }
                    else break;
                }

                setStats({
                    avgHours: activeWorkedDays.length > 0 ? `${(totalHoursSum / activeWorkedDays.length).toFixed(1)}h` : '0h',
                    peakDay: (peakItem && peakItem.hours > 0) ? `${peakItem.dayNum} ${peakItem.dayName}` : '—',
                    arrival: avgArrivalStr,
                    streak: `${streakCount} Days`
                });

            } catch (err) {
                console.error('StatusDemo Calculation Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Realtime Subscription
        const channel = supabase
            .channel('status-demo-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attendance',
                    filter: `employee_id=eq.${userId}`
                },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, currentMonthStart, joinDate]);

    // Format Month Display
    const dateRangeStr = currentMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Custom Tooltip for Chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}>{data.dayNum} {data.dayName}</p>
                    <p style={{ fontSize: '0.9rem', color: '#6366f1' }}>Hours: {data.hours}h</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Status: {data.tooltipStatus}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            paddingBottom: '24px',
            position: 'relative',
            zIndex: 1
        }}>
            {/* Compact Header - Matching Leave Requests Style */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '8px',
                padding: '24px 32px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboard</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>/</span>
                            <span style={{ color: '#22d3ee', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Activity Hub</span>
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                            Your Activity Hub
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: '400' }}>
                            Real-time monitoring of your presence, task engagement, and monthly attendance footprint.
                        </p>
                    </div>

                    <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(12px)',
                        padding: '14px 20px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: 'white',
                                boxShadow: '0 6px 12px rgba(56, 189, 248, 0.2)'
                            }}>
                                {userName?.charAt(0) || 'U'}
                            </div>
                            <div style={{
                                position: 'absolute',
                                bottom: '-3px',
                                right: '-3px',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: userStatus === 'Online' ? '#10b981' : '#f59e0b',
                                border: '2px solid #1e293b',
                            }}></div>
                        </div>
                        <div>
                            <p style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '2px', color: 'white' }}>{userName}</p>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engineering</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unique Representation Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>

                {/* Status Identity Card */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    padding: '24px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.02em' }}>Work Identity</h3>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '500' }}>Your current engagement profile</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { label: 'Live Availability', value: userStatus, color: userStatus === 'Online' ? '#10b981' : '#f59e0b', bg: userStatus === 'Online' ? '#f0fdf4' : '#fffbeb' },
                            { label: 'Active Engagement', value: userTask || 'No active task', color: '#6366f1', bg: '#f5f3ff' },
                            { label: 'Last Signal', value: lastActive, color: '#64748b', bg: '#f8fafc' }
                        ].map((item, idx) => (
                            <div key={idx} style={{
                                padding: '16px',
                                borderRadius: '6px',
                                backgroundColor: item.bg,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{item.label}</span>
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '700',
                                    color: item.color,
                                    padding: '4px 12px',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        marginTop: 'auto',
                        padding: '20px',
                        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                        borderRadius: '6px',
                        color: 'white',
                        textAlign: 'center'
                    }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '700', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Active Streak</p>
                        <h4 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>{stats.streak}</h4>
                        <p style={{ fontSize: '0.8rem', fontWeight: '600', marginTop: '2px' }}>Keep the momentum going!</p>
                    </div>
                </div>

                {/* Performance Footprint (Monthly Log) */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    padding: '24px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.02em' }}>Activity Footprint</h3>
                            <p style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '500' }}>{dateRangeStr}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handlePrevMonth} style={{ width: '36px', height: '36px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                <ChevronLeft size={18} color="#64748b" />
                            </button>
                            <button onClick={handleNextMonth} style={{ width: '36px', height: '36px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                <ChevronRight size={18} color="#64748b" />
                            </button>
                        </div>
                    </div>

                    <div style={{ height: '260px', width: '100%', position: 'relative' }}>
                        {loading ? (
                            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '700' }}>
                                Mapping your signals...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="presenceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="dayNum"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '700' }}
                                        dy={15}
                                        interval={1}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: '700' }}
                                        unit="h"
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="hours"
                                        stroke="#0ea5e9"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#presenceGradient)"
                                        activeDot={{ r: 8, strokeWidth: 3, stroke: '#fff', fill: '#0ea5e9' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div style={{
                        marginTop: '24px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Avg Hours</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{stats.avgHours}</p>
                        </div>
                        <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Peak Day</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{stats.peakDay}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Arrival</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{stats.arrival}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Signal Log - Compact Scrollable Version */}
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.02em' }}>Signal Stream</h3>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '500' }}>Your historical presence records for the month</p>
                    </div>
                </div>

                <div className="no-scrollbar" style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    overflowX: 'auto', 
                    paddingBottom: '8px',
                    maskImage: 'linear-gradient(to right, black 95%, transparent)'
                }}>
                    {monthlyData.map((day, idx) => (
                        <div key={idx} style={{
                            padding: '16px',
                            minWidth: '110px',
                            borderRadius: '6px',
                            backgroundColor: day.hours > 0 ? '#f0f9ff' : '#f8fafc',
                            border: `1px solid ${day.hours > 0 ? '#bae6fd' : '#e2e8f0'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                        }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{day.dayNum} {day.dayName}</span>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '6px',
                                backgroundColor: day.hours > 0 ? '#0ea5e9' : '#e2e8f0',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9rem',
                                fontWeight: '700'
                            }}>
                                {day.hours > 0 ? <Clock size={18} /> : '—'}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>{day.hours}h</p>
                                <p style={{ fontSize: '0.7rem', fontWeight: '600', color: day.hours > 0 ? '#0369a1' : '#94a3b8', margin: 0 }}>{day.tooltipStatus}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StatusDemo;

