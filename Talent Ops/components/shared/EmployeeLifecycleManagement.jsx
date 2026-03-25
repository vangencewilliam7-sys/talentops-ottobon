import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, TrendingUp, History, ArrowRight, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { CareerHistory } from './CareerHistory';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';

const STAGES = ['Intern', 'FullTime_IC', 'Senior_IC', 'TeamLead', 'Manager', 'HR', 'Exited'];
const TRACKS = ['Engineering', 'Management', 'HR', 'Operations', 'Sales'];

export const EmployeeLifecycleManagement = ({ currentUser }) => {
    const careerHistoryRef = useRef(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [history, setHistory] = useState([]);
    const [showPromoteModal, setShowPromoteModal] = useState(false);

    // Promotion Form State
    const [newStage, setNewStage] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (employeeId) => {
        try {
            const { data, error } = await supabase
                .from('employee_stage_history')
                .select('*, approver:approved_by(full_name)')
                .eq('employee_id', employeeId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setNewStage(employee.employee_stage || 'Intern');
        fetchHistory(employee.id);
    };

    const handleStageUpdate = async () => {
        if (!newStage || !reason) return;
        setSubmitting(true);

        try {
            const { error } = await supabase.rpc('update_employee_stage', {
                p_employee_id: selectedEmployee.id,
                p_new_stage: newStage,
                p_reason: reason,
                p_approved_by: currentUser?.id
            });

            if (error) throw error;

            // Update local state
            setEmployees(prev => prev.map(emp =>
                emp.id === selectedEmployee.id ? { ...emp, employee_stage: newStage } : emp
            ));

            // Refresh history
            fetchHistory(selectedEmployee.id);
            setShowPromoteModal(false);
            setReason('');

            alert('Employee stage updated successfully!');
        } catch (error) {
            console.error('Error updating stage:', error);
            alert('Failed to update stage: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading employees...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 w-full font-sans">
            
            {/* Header Section (ONLY DARK PART) */}
            <div className="w-full bg-slate-900 border-b border-slate-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-[22px] font-semibold text-white tracking-tight">Employee Lifecycle Management</h1>
                        <p className="text-gray-400 mt-1.5 text-sm font-medium">Manage career stages and functional tracks</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Employee List */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b border-gray-100 bg-white">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-[15px]">
                                <Users size={18} className="text-gray-500" /> Employees
                            </h2>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-1.5 bg-gray-50/30">
                            {employees.map(emp => (
                                <div
                                    key={emp.id}
                                    onClick={() => handleEmployeeSelect(emp)}
                                    className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                                        selectedEmployee?.id === emp.id
                                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                                            : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="font-semibold text-gray-900 text-sm tracking-tight">{emp.full_name || 'Unnamed'}</div>
                                    <div className="text-[11px] font-medium uppercase tracking-wider flex gap-2 mt-2">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded-md text-gray-600 border border-gray-200/60">
                                            {emp.functional_track || 'No Track'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md border ${
                                            emp.employee_stage === 'Exited' 
                                            ? 'bg-red-50 text-red-600 border-red-100' 
                                            : 'bg-green-50 text-green-700 border-green-100'
                                        }`}>
                                            {emp.employee_stage || 'Intern'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Details & History */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {selectedEmployee ? (
                            <>
                                {/* Actions Card */}
                                <div className="bg-white rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.04)] border border-gray-200 p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{selectedEmployee.full_name}</h2>
                                            <div className="text-gray-500 text-sm mt-1 font-medium">{selectedEmployee.email}</div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                >
                                                    <TrendingUp size={16} /> Change Stage
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 mt-1 bg-white border border-gray-200 shadow-xl rounded-xl p-1.5 z-50">
                                                <DropdownMenuItem
                                                    onSelect={() => setShowPromoteModal(true)}
                                                    className="flex items-center gap-2.5 px-3 py-2 outline-none rounded-md cursor-pointer hover:bg-gray-50 transition-colors focus:bg-gray-50"
                                                >
                                                    <TrendingUp size={15} className="text-blue-600" />
                                                    <span className="font-medium text-gray-700 text-sm">Update Stage</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onSelect={() => careerHistoryRef.current?.openModal()}
                                                    className="flex items-center gap-2.5 px-3 py-2 outline-none rounded-md cursor-pointer hover:bg-gray-50 transition-colors focus:bg-gray-50"
                                                >
                                                    <Plus size={15} className="text-blue-600" />
                                                    <span className="font-medium text-gray-700 text-sm">Add Position</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                                            <div className="text-[11px] uppercase font-medium text-gray-500 tracking-wider mb-1">Current Stage</div>
                                            <div className="text-[15px] font-semibold text-gray-900 tracking-tight">{selectedEmployee.employee_stage || 'Intern'}</div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                                            <div className="text-[11px] uppercase font-medium text-gray-500 tracking-wider mb-1">Functional Track</div>
                                            <div className="text-[15px] font-semibold text-gray-900 tracking-tight">{selectedEmployee.functional_track || 'Engineering'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* History Timeline */}
                                <CareerHistory ref={careerHistoryRef} employeeId={selectedEmployee.id} />
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 font-medium bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                                Select an employee to view career details
                            </div>
                        )}
                    </div>
                </div>

                {/* Promotion Modal */}
                {showPromoteModal && (
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                            
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-lg font-semibold text-gray-900">Update Career Stage</h3>
                                <button onClick={() => setShowPromoteModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Stage</label>
                                    <select
                                        value={newStage}
                                        onChange={(e) => setNewStage(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 bg-white text-gray-900 text-sm font-medium rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                    >
                                        {STAGES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for Change</label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="e.g. Annual promotion, Performance review..."
                                        className="w-full p-3 border border-gray-200 bg-white text-gray-900 text-sm font-medium rounded-lg h-28 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-gray-400"
                                    />
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <button
                                        onClick={() => setShowPromoteModal(false)}
                                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors outline-none focus:ring-2 focus:ring-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleStageUpdate}
                                        disabled={submitting || !reason}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
                                    >
                                        {submitting ? 'Updating...' : 'Confirm Update'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
