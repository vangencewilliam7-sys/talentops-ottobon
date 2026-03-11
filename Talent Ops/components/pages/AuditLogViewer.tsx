import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Clock,
    User,
    Activity,
    ArrowLeft,
    Filter,
    Building
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AuditLogViewer = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-8">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate('/super-admin')}
                    className="flex items-center gap-2 text-slate-500 hover:text-orange-600 font-bold mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Console
                </button>

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">System Audit Logs</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Real-time security monitoring across all tenants.</p>
                    </div>
                    <div className="bg-white border border-slate-100 p-2 rounded-xl flex gap-2">
                        <button className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-100 transition-all">
                            <Filter size={16} />
                            Filter
                        </button>
                        <button
                            onClick={fetchLogs}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
                        >
                            <Activity size={16} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden whitespace-nowrap">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-50">
                            <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.1em]">
                                <th className="px-8 py-5">Timestamp</th>
                                <th className="px-8 py-5">User / Org</th>
                                <th className="px-8 py-5">Action</th>
                                <th className="px-8 py-5">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-medium">Scanning security protocols...</td></tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                                            <Clock size={14} className="text-slate-300" />
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                                                <User size={14} className="text-orange-400" />
                                                {log.user_id?.slice(0, 8) || 'System'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold mt-1">
                                                <Building size={12} />
                                                {log.org_id?.slice(0, 8) || 'Global'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${log.action.includes('CREATE') ? 'bg-green-50 text-green-600 border border-green-100' :
                                                log.action.includes('DELETE') ? 'bg-red-50 text-red-600 border border-red-100' :
                                                    'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-slate-500 text-sm font-medium truncate max-w-xs group-hover:text-slate-900 transition-colors">
                                            {log.details ? JSON.stringify(log.details) : 'No extra data'}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {!loading && logs.length === 0 && (
                        <div className="p-24 text-center">
                            <Activity size={48} className="mx-auto text-slate-100 mb-4" />
                            <p className="text-slate-400 font-bold">No security events logged yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogViewer;
