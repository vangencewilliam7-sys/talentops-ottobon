import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// @ts-ignore
import Layout from '../employee/components/Layout/Layout';
// @ts-ignore
import DashboardHome from '../employee/pages/DashboardHome';
// @ts-ignore
import ModulePage from '../employee/pages/ModulePage';
// @ts-ignore
import MessagingHub from '../shared/MessagingHub';
// @ts-ignore
import { ToastProvider } from '../employee/context/ToastContext';
// @ts-ignore
import { UserProvider } from '../employee/context/UserContext';
// @ts-ignore
import { ProjectProvider } from '../employee/context/ProjectContext';
import RoleGuard from '../shared/RoleGuard';
import '../employee/index.css';

export const EmployeeDashboard = () => {
    return (
        <RoleGuard allowedRoles={['employee']}>
            <UserProvider>
                <ProjectProvider>
                    <ToastProvider>
                        <Layout>
                            <Routes>
                                <Route path="/" element={<Navigate to="dashboard" replace />} />
                                <Route path="dashboard" element={<DashboardHome />} />
                                <Route path="analytics" element={<ModulePage title="My Analytics" type="analytics" />} />
                                <Route path="employees" element={<ModulePage title="Team Members" type="workforce" />} />
                                <Route path="tasks" element={<ModulePage title="Your Tasks" type="tasks" />} />
                                <Route path="leaves" element={<ModulePage title="Leave Requests" type="leaves" />} />
                                <Route path="team-status" element={<ModulePage title="Your Status" type="status" />} />
                                <Route path="payslips" element={<ModulePage title="Your Payslip" type="payroll" />} />
                                <Route path="policies" element={<ModulePage title="Policies" type="policies" />} />
                                <Route path="hierarchy" element={<ModulePage title="Organizational Hierarchy" type="default" />} />
                                <Route path="project-hierarchy" element={<ModulePage title="Project Hierarchy" type="default" />} />
                                <Route path="messages" element={<MessagingHub />} />
                                <Route path="announcements" element={<ModulePage title="Announcements" type="default" />} />
                                <Route path="settings" element={<ModulePage title="Settings" type="default" />} />
                                {/* Role-specific routes for Team Lead and Manager */}
                                <Route path="assign-tasks" element={<ModulePage title="Assign Tasks" type="tasks" />} />
                                <Route path="approve-leaves" element={<ModulePage title="Approve Leaves" type="leaves" />} />
                                <Route path="manage-members" element={<ModulePage title="Manage Members" type="workforce" />} />
                                <Route path="performance" element={<ModulePage title="Team Performance" type="analytics" />} />
                            </Routes>
                        </Layout>
                    </ToastProvider>
                </ProjectProvider>
            </UserProvider>
        </RoleGuard>
    );
};
