import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Building2, Users, ShieldCheck, Activity, Plus, Search, MoreVertical,
    Settings2, FileText, AlertCircle, Clock, Check, X, ClipboardList, Rocket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [orgs, setOrgs] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<any>(null);
    const [stats, setStats] = useState({ totalOrgs: 0, totalUsers: 0, activeSystems: 0 });
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ show: boolean, id: string, name: string, type: 'approve' | 'reject' | 'delete' } | null>(null);
    const [formData, setFormData] = useState({
        org_name: '',
        org_slug: '',
        exec_email: '',
        exec_password: ''
    });

    useEffect(() => {
        // FORCE ENABLE SCROLLING
        const enableScroll = () => {
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
            document.body.style.height = 'auto';
            document.body.style.position = 'static';
        };

        enableScroll();
        window.addEventListener('resize', enableScroll);
        
        console.log('SuperAdminDashboard Mounted. Scrolling forced.');
        fetchData();
        
        return () => window.removeEventListener('resize', enableScroll);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: orgsData, error: orgsError } = await supabase
                .from('orgs')
                .select('*')
                .order('created_at', { ascending: false });

            if (orgsError) throw orgsError;
            setOrgs(orgsData || []);

            const { data: requestsData, error: requestsError } = await supabase
                .from('onboarding_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (!requestsError) {
                setPendingRequests(requestsData || []);
            }

            const { count: orgCount } = await supabase.from('orgs').select('*', { count: 'exact', head: true });
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            setStats({
                totalOrgs: orgCount || 0,
                totalUsers: userCount || 0,
                activeSystems: orgsData?.filter(o => o.is_active).length || 0
            });
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        setProcessingId(requestId);
        setConfirmModal(null);
        try {
            // 1. Get request
            const { data: request, error: getError } = await supabase
                .from('onboarding_requests')
                .select('*')
                .eq('id', requestId)
                .single();
            if (getError) throw getError;

            // 2. Find or Create the profile
            const cleanEmail = request.admin_email.toLowerCase().trim();
            console.log('Finalizing provisioning for:', cleanEmail);

            let { data: userProfiles } = await supabase
                .from('profiles')
                .select('id')
                .ilike('email', cleanEmail);
            
            let targetProfileIds = userProfiles?.map(p => p.id) || [];

            // 3. Create the Organization record
            const newOrgId = crypto.randomUUID();
            const { data: newOrg, error: orgError } = await supabase
                .from('orgs')
                .insert({
                    id: newOrgId,
                    org_id: newOrgId,
                    name: request.org_name,
                    slug: request.org_slug,
                    is_active: true,
                    enabled_modules: request.selected_modules
                })
                .select()
                .single();
            if (orgError) throw orgError;


            // 5. Update Request
            await supabase.from('onboarding_requests').update({ 
                status: 'approved',
                approved_at: new Date().toISOString()
            }).eq('id', requestId);

            // 6. Email via Proxy
            const emailHtml = `<div style="font-family: serif; padding: 40px; text-align: center;"><h1>Workspace Ready!</h1><p>Your workspace for ${request.org_name} is ready. Access it at ${window.location.origin}/login</p></div>`;
            await fetch('http://localhost:54322/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: 'TalentOps <onboarding@resend.dev>',
                    to: [request.admin_email],
                    subject: `Workspace Ready: ${request.org_name}`,
                    html: emailHtml
                })
            });

            fetchData();
        } catch (error: any) {
            console.error('Approval error:', error);
            alert('Error: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId: string) => {
        setProcessingId(requestId);
        setConfirmModal(null);
        try {
            const { error } = await supabase
                .from('onboarding_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (error) throw error;
            fetchData();
        } catch (error: any) {
            console.error('Rejection error:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteOrg = async (orgId: string, orgName: string) => {
        setProcessingId(orgId);
        setConfirmModal(null);
        try {
            // 1. Get the slug for this org to clean up requests
            const { data: orgData } = await supabase.from('orgs').select('slug').eq('id', orgId).single();

            // 2. Reset profiles linked to this org
            await supabase.from('profiles').update({ 
                org_id: null, 
                role: 'employee' 
            }).eq('org_id', orgId);

            // 3. Delete the organization
            const { error: orgDelError } = await supabase.from('orgs').delete().eq('id', orgId);
            if (orgDelError) throw orgDelError;

            // 4. Clean up the onboarding request
            if (orgData?.slug) {
                await supabase.from('onboarding_requests').delete().eq('org_slug', orgData.slug);
            }

            fetchData();
        } catch (error: any) {
            console.error('Deletion error:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleProvision = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await supabase.functions.invoke('create-tenant-org', {
                body: {
                    ...formData,
                    enabled_modules: {
                        tasks: true, messages: true, payroll: true,
                        leaves: true, performance: true, hiring: true,
                        workforce: true, announcements: true
                    }
                }
            });

            setIsModalOpen(false);
            setFormData({ org_name: '', org_slug: '', exec_email: '', exec_password: '' });
            fetchData();
        } catch (error: any) {
            console.error('Provisioning error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-8 relative overflow-y-auto">
            <style dangerouslySetInnerHTML={{ __html: `
                html, body { 
                    overflow: auto !important; 
                    height: auto !important; 
                    position: static !important;
                }
            `}} />
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                        Control <span className="text-orange-600">Center</span>
                    </h1>
                    <p className="text-slate-500 font-medium">SaaS Global Administration</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl"
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
                    <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
                            <stat.icon size={28} />
                        </div>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{stat.label}</p>
                        <h3 className="text-4xl font-black text-slate-900">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden mb-12">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-orange-50/30">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                        <Clock className="text-orange-500" /> Pending Approvals
                    </h2>
                </div>
                {pendingRequests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                                {pendingRequests.map((req) => (
                                    <tr key={req.id}>
                                        <td className="px-8 py-6">{req.org_name}</td>
                                        <td className="px-8 py-6">{req.admin_email}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                    onClick={() => setConfirmModal({ show: true, id: req.id, name: req.org_name, type: 'approve' })}
                                                    disabled={!!processingId}
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button 
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                                    onClick={() => setConfirmModal({ show: true, id: req.id, name: req.org_name, type: 'reject' })}
                                                    disabled={!!processingId}
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <ClipboardList size={32} />
                        </div>
                        <h3 className="text-slate-900 font-bold">Queue is Empty</h3>
                        <p className="text-slate-500 text-sm">New onboarding requests will appear here for review.</p>
                    </div>
                )}
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
                                        <span className="text-[10px] font-mono bg-slate-50 text-slate-400 px-3 py-1 rounded-full border border-slate-100">
                                            {org.id.slice(0, 8)}...
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${org.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${org.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {org.is_active ? 'Healthy' : 'Inactive'}
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
                                            <button 
                                                onClick={() => setConfirmModal({ show: true, id: org.id, name: org.name, type: 'delete' })}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-all text-slate-400 hover:text-red-500 shadow-sm border border-transparent hover:border-red-100"
                                                title="Wipe & Reset"
                                            >
                                                <X size={18} />
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
            {/* Unified Premium Confirmation Modal */}
            <AnimatePresence>
                {confirmModal?.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                            onClick={() => setConfirmModal(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-white/20"
                        >
                            <div className="text-center">
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${
                                    confirmModal.type === 'approve' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'
                                }`}>
                                    {confirmModal.type === 'approve' ? <Rocket size={40} /> : <AlertCircle size={40} />}
                                </div>
                                <h3 className="text-2xl font-bold text-[#1f2937] mb-2">
                                    {confirmModal.type === 'approve' ? 'Approve Workspace' : confirmModal.type === 'reject' ? 'Reject Request' : 'Wipe Organization'}
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed mb-8">
                                    {confirmModal.type === 'approve' && `Are you sure you want to provision the workspace for "${confirmModal.name}"?`}
                                    {confirmModal.type === 'reject' && `Are you sure you want to reject the request from "${confirmModal.name}"?`}
                                    {confirmModal.type === 'delete' && `WIPE DATA: This will permanently delete "${confirmModal.name}" and reset the user.`}
                                </p>
                                
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setConfirmModal(null)}
                                        className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (confirmModal.type === 'approve') handleApprove(confirmModal.id);
                                            else if (confirmModal.type === 'reject') handleReject(confirmModal.id);
                                            else if (confirmModal.type === 'delete') handleDeleteOrg(confirmModal.id, confirmModal.name);
                                        }}
                                        className={`flex-1 p-4 text-white rounded-xl font-bold text-sm transition-all shadow-xl ${
                                            confirmModal.type === 'approve' ? 'bg-[#111827] hover:bg-black shadow-black/10' : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                                        }`}
                                    >
                                        {confirmModal.type === 'approve' ? 'Approve & Launch' : confirmModal.type === 'reject' ? 'Confirm Reject' : 'Delete Now'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SuperAdminDashboard;
