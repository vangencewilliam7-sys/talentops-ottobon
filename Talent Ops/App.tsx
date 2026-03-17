import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from './components/pages/LoginPage';
import { LandingPage } from './landing/LandingPage';
import { ExecutiveDashboard } from './components/pages/ExecutiveDashboard';
import { ManagerDashboard } from './components/pages/ManagerDashboard';
import { TeamLeadDashboard } from './components/pages/TeamLeadDashboard';
import { EmployeeDashboard } from './components/pages/EmployeeDashboard';
import { ForgotPasswordPage } from './components/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './components/pages/ResetPasswordPage';
import SuperAdminDashboard from './components/pages/SuperAdminDashboard';
import AuditLogViewer from './components/pages/AuditLogViewer';
// @ts-ignore
import FullRankingPage from './components/performance/FullRankingPage';
// @ts-ignore
import { ThemeProvider } from './components/shared/context/ThemeContext';
import { supabase } from './lib/supabaseClient';
import { RequestDemoPage } from './landing/sections/RequestDemoPage';
// @ts-ignore
import PricingPage from './landing/sections/PricingPage';
import { StylesInjection } from './landing/styles/StylesInjection';

function App() {


    return (
        <Router>
            <StylesInjection />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/request-demo" element={<RequestDemoPage />} />
                <Route path="/pricing" element={<PricingPage />} />

                {/* Wrap application routes with ThemeProvider */}
                <Route element={<ThemeProvider><Outlet /></ThemeProvider>}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/executive-dashboard/*" element={<ExecutiveDashboard />} />
                    <Route path="/manager-dashboard/*" element={<ManagerDashboard />} />
                    <Route path="/teamlead-dashboard/*" element={<TeamLeadDashboard />} />
                    <Route path="/employee-dashboard/*" element={<EmployeeDashboard />} />
                    <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
                    <Route path="/audit-logs" element={<AuditLogViewer />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
