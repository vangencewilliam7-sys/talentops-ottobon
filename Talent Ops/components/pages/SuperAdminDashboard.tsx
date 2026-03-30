import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Building2,
    Users,
    ShieldCheck,
    Activity,
    Plus,
    Search,
    MoreVertical,
    Settings2,
    FileText,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [orgs, setOrgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        org_name: '',
        org_slug: '',
        exec_email: '',
        exec_password: ''
    });

    const [stats, setStats] = useState({
        totalOrgs: 0,
        totalUsers: 0,
        activeSystems: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: orgsData, error: orgsError } = await supabase
                .from('orgs')
                .select('*')
                .order('created_at', { ascending: false });

            if (orgsError) throw orgsError;
            setOrgs(orgsData);

            const { count: orgCount } = await supabase.from('orgs').select('*', { count: 'exact', head: true });
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            setStats({
                totalOrgs: orgCount || 0,
                totalUsers: userCount || 0,
                activeSystems: orgsData.filter(o => o.is_active).length
            });
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProvision = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data, error: funcError } = await supabase.functions.invoke('create-tenant-org', {
                body: {
                    ...formData,
                    enabled_modules: {
                        tasks: true,
                        messages: true,
                        payroll: true,
                        leaves: true,
                        performance: true,
                        hiring: true,
                        workforce: true,
                        announcements: true
                    }
                }
            });

            if (funcError) throw funcError;

            alert('Organization and Executive account provisioned successfully!');
            setIsModalOpen(false);
            setFormData({ 
                org_name: '', 
                org_slug: '', 
                exec_email: '', 
                exec_password: '' 
            });
            fetchData();
        } catch (error: any) {
            console.error('Provisioning error:', error);
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-8">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                        Control <span className="text-orange-600">Center</span>
                    </h1>
                    <p className="text-slate-500 font-medium">SaaS Global Administration & Monitoring</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-slate-200"
                >
                    <Plus size={20} /> Provision New Org
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {[
                    { label: 'Total Organizations', value: stats.totalOrgs, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Platform Users', value: stats.totalUsers, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Active Systems', value: stats.activeSystems, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
                            <stat.icon size={28} />
                        </div>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-4xl font-black text-slate-900">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-bottom border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                        <Activity className="text-orange-500" /> Live Tenants
                    </h2>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                placeholder="Search partitions..."
                                className="bg-white border-none rounded-xl pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-orange-500 w-64 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organization</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shard ID</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {orgs.map((org) => (
                                <tr key={org.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-all font-bold">
                                                {org.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{org.name}</p>
                                                <p className="text-xs text-slate-400 font-mono">/{org.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{org.id.split('-')[0]}...</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${org.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                            <span className={`text-xs font-bold ${org.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                {org.is_active ? 'HEALTHY' : 'SUSPENDED'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm text-slate-500 font-medium">
                                            {new Date(org.created_at).toLocaleDateString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-200">
                                                <Settings2 size={18} />
                                            </button>
                                            <button className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-200">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg p-10 shadow-2xl border border-slate-100">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Provision New Organization</h2>
                            <p className="text-slate-500">Configure basic tenant details and super-executive credentials.</p>
                        </div>

                        <form onSubmit={handleProvision} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Display Name</label>
                                    <input
                                        required
                                        placeholder="e.g. Acme Corp"
                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
                                        value={formData.org_name}
                                        onChange={e => {
                                            const name = e.target.value;
                                            const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
                                            setFormData({ ...formData, org_name: name, org_slug: slug });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Slug / URL</label>
                                    <input
                                        required
                                        placeholder="acme-corp"
                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 font-mono text-orange-600"
                                        value={formData.org_slug}
                                        onChange={e => setFormData({ ...formData, org_slug: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Executive Email</label>
                                <input
                                    required
                                    type="email"
                                    placeholder="ceo@acmecorp.com"
                                    value={formData.exec_email}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
                                    onChange={e => setFormData({ ...formData, exec_email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Temporary Password</label>
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
                                    onChange={e => setFormData({ ...formData, exec_password: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                                >
                                    Discard
                                </button>
                                <button
                                    disabled={isSubmitting}
                                    className="flex-3 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Activity className="animate-spin" size={16} /> 
                                            Deploying Environment...
                                        </>
                                    ) : (
                                        'Initialize & Provision'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
