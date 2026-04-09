import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const YearMonthSelector = ({ selectedMonth, selectedYear, onChange }) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(8px)',
      padding: '8px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.7)' }}>
        <Calendar size={18} />
        <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period</span>
      </div>

      <div style={{ height: '20px', width: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

      {/* Month Selector */}
      <div style={{ position: 'relative' }}>
        <select
          value={selectedMonth}
          onChange={(e) => onChange({ month: e.target.value, year: selectedYear })}
          style={{
            appearance: 'none',
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: '700',
            padding: '4px 28px 4px 8px',
            cursor: 'pointer',
            outline: 'none',
            borderRadius: '6px'
          }}
        >
          {months.map(m => (
            <option key={m} value={m} style={{ background: '#1e293b', color: 'white' }}>{m}</option>
          ))}
        </select>
        <ChevronDown size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.5)' }} />
      </div>

      {/* Year Selector */}
      <div style={{ position: 'relative' }}>
        <select
          value={selectedYear}
          onChange={(e) => onChange({ month: selectedMonth, year: parseInt(e.target.value) })}
          style={{
            appearance: 'none',
            background: 'transparent',
            border: 'none',
            color: '#22d3ee',
            fontSize: '0.9rem',
            fontWeight: '800',
            padding: '4px 28px 4px 8px',
            cursor: 'pointer',
            outline: 'none',
            borderRadius: '6px'
          }}
        >
          {years.map(y => (
            <option key={y} value={y} style={{ background: '#1e293b', color: 'white' }}>{y}</option>
          ))}
        </select>
        <ChevronDown size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(22, 211, 238, 0.5)' }} />
      </div>
    </div>
  );
};

export default YearMonthSelector;
