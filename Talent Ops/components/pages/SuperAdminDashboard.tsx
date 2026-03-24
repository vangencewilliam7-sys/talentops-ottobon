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
            // Call the actual Edge Function instead of a missing RPC
            const { data, error: funcError } = await supabase.functions.invoke('create-tenant-org', {
                body: {
                    org_name: formData.org_name,
                    org_slug: formData.org_slug,
                    exec_email: formData.exec_email,
                    exec_password: formData.exec_password
                }
            });

            if (funcError) throw funcError;

            alert('Organization and Executive account provisioned successfully!');
            setIsModalOpen(false);
            setFormData({ org_name: '', org_slug: '', exec_email: '', exec_password: '' });
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
            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg p-10 shadow-2xl border border-slate-100">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Build New Organization</h2>
                            <p className="text-slate-500">Initialize a new tenant environment and executive account.</p>
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

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSubmitting}
                                    type="submit"
                                    className="flex-1 bg-orange-500 text-white px-6 py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Provisioning...' : 'Confirm & Launch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Platform Console</h1>
                        <p className="text-slate-500 font-medium">Global Multi-Tenancy Management</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-[#F97316] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#EA580C] transition-all shadow-lg shadow-orange-100"
                    >
                        <Plus size={20} />
                        Provision New Org
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {[
                        { label: 'Total Organizations', value: stats.totalOrgs, icon: Building2, color: 'blue' as const },
                        { label: 'Platform Users', value: stats.totalUsers, icon: Users, color: 'orange' as const },
                        { label: 'System Health', value: 100, icon: Activity, color: 'green' as const }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
                            <div className={`p-4 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                                <stat.icon size={28} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Organizations Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="text-orange-500" size={20} />
                            Registered Tenants
                        </h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by slug or name..."
                                className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-orange-500 w-64"
                            />
                        </div>
                    </div>

                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">ID / Slug</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Modules</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="p-20 text-center text-slate-400">Loading infrastructure...</td></tr>
                            ) : orgs.map((org) => (
                                <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                                {org.name[0]}
                                            </div>
                                            <span className="font-semibold text-slate-900">{org.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                        {org.slug || org.id}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${org.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {org.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {Object.keys(org.enabled_modules || {}).slice(0, 3).map(m => (
                                                <span key={m} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] capitalize">
                                                    {m}
                                                </span>
                                            ))}
                                            {Object.keys(org.enabled_modules || {}).length > 3 && (
                                                <span className="text-[10px] text-slate-400">+{Object.keys(org.enabled_modules).length - 3}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                                                <Settings2 size={18} />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {orgs.length === 0 && !loading && (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <AlertCircle size={32} />
                            </div>
                            <p className="text-slate-500 font-medium">No organizations found in registry.</p>
                        </div>
                    )}
                </div>

                {/* System Logs Quick View */}
                <div className="mt-8 flex gap-6">
                    <button
                        onClick={() => navigate('/audit-logs')}
                        className="flex-1 bg-white border border-slate-100 p-4 rounded-xl flex items-center justify-between hover:border-orange-200 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500">
                                <FileText size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900">Audit Logs</p>
                                <p className="text-xs text-slate-500">Review system-wide changes</p>
                            </div>
                        </div>
                        <ShieldCheck size={20} className="text-slate-300" />
                    </button>

                    <button className="flex-1 bg-white border border-slate-100 p-4 rounded-xl flex items-center justify-between hover:border-orange-200 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500">
                                <Users size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900">Platform Users</p>
                                <p className="text-xs text-slate-500">Manage global accounts</p>
                            </div>
                        </div>
                        <ShieldCheck size={20} className="text-slate-300" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
