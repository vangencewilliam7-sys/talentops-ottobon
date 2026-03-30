import {
    LayoutDashboard, BarChart2, Users, ListTodo, CalendarOff, Receipt, FileText, Network, DollarSign,
    ClipboardList, UserCheck, Megaphone, MessageCircle, TrendingUp, Ticket, FolderOpen, Target, User, Trophy, Briefcase, FileCheck
} from 'lucide-react';

export const getSidebarConfig = (userRole, projectRole, basePath) => {
    // Determine userRole from lowercase
    const role = userRole?.toLowerCase();
    const pRole = projectRole?.toLowerCase() || 'consultant';

    if (role === 'executive') {
        return {
            org: [
                { icon: LayoutDashboard, label: 'Dashboard', path: `${basePath}/dashboard` },
                { icon: Users, label: 'Employees', path: `${basePath}/employees` },
                { icon: UserCheck, label: 'Employee Status', path: `${basePath}/employee-status` },
                { icon: ClipboardList, label: 'Attendance Logs', path: `${basePath}/attendance-logs` },
                { icon: CalendarOff, label: 'Leave Requests', path: `${basePath}/leaves` },
                { icon: DollarSign, label: 'Payroll', path: `${basePath}/payroll` },
                { icon: Receipt, label: 'Payslips', path: `${basePath}/payslips` },
                { icon: FileText, label: 'Invoice', path: `${basePath}/invoice` },
                { icon: Briefcase, label: 'Hiring Portal', path: `${basePath}/hiring` },
                { icon: Network, label: 'Org Hierarchy', path: `${basePath}/hierarchy` },
                { icon: Megaphone, label: 'Announcements', path: `${basePath}/announcements` },
                { icon: MessageCircle, label: 'Messages', path: `${basePath}/messages` },
                { icon: FileCheck, label: 'Policies', path: `${basePath}/policies` },
                { icon: TrendingUp, label: 'Review', path: `${basePath}/executive-reviews` },
                { icon: Trophy, label: 'Ranking', path: `${basePath}/rankings` },
                { icon: Ticket, label: 'Raise a Ticket', path: `${basePath}/raise-ticket` },
            ],
            project: [ // Project level tools for executives
                { icon: FolderOpen, label: 'Projects', path: `${basePath}/projects` },
                { icon: ListTodo, label: 'Tasks', path: `${basePath}/tasks` },
                { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
                { icon: TrendingUp, label: 'Project Analytics', path: `${basePath}/project-analytics` },
                { icon: Network, label: 'Project Hierarchy', path: `${basePath}/project-hierarchy` },
                { icon: FileText, label: 'Documents', path: `${basePath}/documents` },
            ]
        };
    }

    if (role === 'manager') {
        const pMenus = {
            consultant: [
                { icon: Users, label: 'Team Members', path: `${basePath}/project-members` },
                { icon: FileText, label: 'Project Documents', path: `${basePath}/documents` },
                { icon: User, label: 'My Tasks', path: `${basePath}/personal-tasks` },
                { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
                { icon: Network, label: 'Hierarchy', path: `${basePath}/project-hierarchy` },
            ],
            employee: [
                { icon: Users, label: 'Team Members', path: `${basePath}/project-members` },
                { icon: FileText, label: 'Project Documents', path: `${basePath}/documents` },
                { icon: User, label: 'My Tasks', path: `${basePath}/personal-tasks` },
                { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
                { icon: Network, label: 'Hierarchy', path: `${basePath}/project-hierarchy` },
            ],
            team_lead: [
                { icon: FileText, label: 'Project Documents', path: `${basePath}/documents` },
                { icon: Users, label: 'Team Members', path: `${basePath}/project-members` },
                { icon: ListTodo, label: 'All Project Tasks', path: `${basePath}/tasks` },
                { icon: User, label: 'My Tasks', path: `${basePath}/personal-tasks` },
                { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
                { icon: Network, label: 'Hierarchy', path: `${basePath}/project-hierarchy` },
            ],
            manager: [
                { icon: FileText, label: 'Project Documents', path: `${basePath}/documents` },
                { icon: Users, label: 'Team Members', path: `${basePath}/project-members` },
                { icon: ListTodo, label: 'All Project Tasks', path: `${basePath}/tasks` },
                { icon: User, label: 'My Tasks', path: `${basePath}/personal-tasks` },
                { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
                { icon: Network, label: 'Project Hierarchy', path: `${basePath}/project-hierarchy` },
            ]
        };

        return {
            org: [
                { icon: LayoutDashboard, label: 'Dashboard', path: `${basePath}/dashboard` },
                { icon: ListTodo, label: 'All Tasks', path: `${basePath}/global-tasks` },
                { icon: Users, label: 'Employees', path: `${basePath}/employees` },
                { icon: ClipboardList, label: 'Attendance Logs', path: `${basePath}/attendance-logs` },
                { icon: CalendarOff, label: 'Leave Requests', path: `${basePath}/leaves` },
                { icon: CalendarOff, label: 'My Leaves', path: `${basePath}/my-leaves` },
                { icon: DollarSign, label: 'Payroll', path: `${basePath}/payroll` },
                { icon: Receipt, label: 'Payslips', path: `${basePath}/payslips` },
                { icon: Network, label: 'Org Hierarchy', path: `${basePath}/hierarchy` },
                { icon: Megaphone, label: 'Announcements', path: `${basePath}/announcements` },
                { icon: MessageCircle, label: 'Messages', path: `${basePath}/messages` },
                { icon: FileCheck, label: 'Policies', path: `${basePath}/policies` },
                { icon: TrendingUp, label: 'Review', path: `${basePath}/team-reviews` },
                { icon: Trophy, label: 'Ranking', path: `${basePath}/rankings` },
                { icon: Ticket, label: 'Raise a Ticket', path: `${basePath}/raise-ticket` },
            ],
            project: pMenus[pRole] || pMenus.consultant
        };
    }

    if (role === 'team_lead' || role === 'teamlead') {
        const pMenus = {
            consultant: [
                { icon: FileText, label: 'Project Documents', path: `${basePath}/documents` },
                { icon: Users, label: 'Team Members', path: `${basePath}/employees` },
                { icon: ListTodo, label: 'Tasks', path: `${basePath}/tasks` },
                { icon: ClipboardList, label: 'Team Tasks', path: `${basePath}/team-tasks` },
                { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
                { icon: Network, label: 'Project Hierarchy', path: `${basePath}/project-hierarchy` },
            ]
        };

        return {
            org: [
                { icon: LayoutDashboard, label: 'Dashboard', path: `${basePath}/dashboard` },
                { icon: UserCheck, label: 'Team Status', path: `${basePath}/team-status` },
                { icon: CalendarOff, label: 'Leave Requests', path: `${basePath}/leaves` },
                { icon: Receipt, label: 'Payslips', path: `${basePath}/payslips` },
                { icon: FileText, label: 'Policies', path: `${basePath}/policies` },
                { icon: Network, label: 'Org Hierarchy', path: `${basePath}/hierarchy` },
                { icon: Megaphone, label: 'Announcements', path: `${basePath}/announcements` },
                { icon: MessageCircle, label: 'Messages', path: `${basePath}/messages` },
                { icon: TrendingUp, label: 'Review', path: `${basePath}/team-reviews` },
                { icon: Trophy, label: 'Ranking', path: `${basePath}/rankings` },
                { icon: Ticket, label: 'Raise a Ticket', path: `${basePath}/raise-ticket` },
            ],
            project: pMenus.consultant
        };
    }

    // Default: Employee / Consultant
    const pMenus = {
        consultant: [
            { icon: Users, label: 'Project', path: `${basePath}/employees` },
            { icon: Users, label: 'Team Members', path: `${basePath}/team-members` },
            { icon: ListTodo, label: 'My Tasks', path: `${basePath}/my-tasks` },
            { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
            { icon: Network, label: 'Hierarchy', path: `${basePath}/project-hierarchy` },
        ],
        employee: [
            { icon: Users, label: 'Project', path: `${basePath}/employees` },
            { icon: Users, label: 'Team Members', path: `${basePath}/team-members` },
            { icon: ListTodo, label: 'My Tasks', path: `${basePath}/my-tasks` },
            { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
            { icon: Network, label: 'Hierarchy', path: `${basePath}/project-hierarchy` },
        ],
        team_lead: [
            { icon: Users, label: 'My Project', path: `${basePath}/employees` },
            { icon: Users, label: 'Team Members', path: `${basePath}/team-members` },
            { icon: ClipboardList, label: 'My Tasks', path: `${basePath}/my-tasks` },
            { icon: ListTodo, label: 'Team Tasks', path: `${basePath}/team-tasks` },
            { icon: TrendingUp, label: 'Performance', path: `${basePath}/performance` },
            { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
            { icon: Network, label: 'Hierarchy', path: `${basePath}/project-hierarchy` },
        ],
        manager: [
            { icon: Users, label: 'Project', path: `${basePath}/employees` },
            { icon: Users, label: 'Team Members', path: `${basePath}/team-members` },
            { icon: ClipboardList, label: 'My Tasks', path: `${basePath}/my-tasks` },
            { icon: ListTodo, label: 'Team Tasks', path: `${basePath}/team-tasks` },
            { icon: TrendingUp, label: 'Performance', path: `${basePath}/performance` },
            { icon: BarChart2, label: 'Analytics', path: `${basePath}/analytics` },
            { icon: Network, label: 'Hierarchy', path: `${basePath}/project-hierarchy` },
        ]
    };

    return {
        org: [
            { icon: LayoutDashboard, label: 'Dashboard', path: `${basePath}/dashboard` },
            { icon: UserCheck, label: 'My Attendance', path: `${basePath}/team-status` },
            { icon: CalendarOff, label: 'Leaves', path: `${basePath}/leaves` },
            { icon: Receipt, label: 'Payslip', path: `${basePath}/payslips` },
            { icon: FileText, label: 'Policies', path: `${basePath}/policies` },
            { icon: Megaphone, label: 'Announcements', path: `${basePath}/announcements` },
            { icon: MessageCircle, label: 'Messages', path: `${basePath}/messages` },
            { icon: Network, label: 'Org Hierarchy', path: `${basePath}/org-hierarchy` },
            { icon: TrendingUp, label: 'Review', path: `${basePath}/review` },
            { icon: Ticket, label: 'Raise a Ticket', path: `${basePath}/raise-ticket` },
        ],
        project: pMenus[pRole] || pMenus.consultant
    };
};
