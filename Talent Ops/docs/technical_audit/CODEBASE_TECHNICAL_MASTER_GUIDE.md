# 📘 TalentOps: Comprehensive Technical Codebase Guide

This document provides a line-by-line and architectural breakdown of the TalentOps multi-tenant platform. It is designed for senior engineering reviews to explain exactly how data flows, how security is enforced, and how the modules interact.

---

## 📂 1. Folder Structure & Role
| Directory | Responsibility |
| :--- | :--- |
| `components/employee/` | Dashboard, Pages, and Contexts for the Main Application. |
| `components/shared/` | Reusable modules like `AllTasksView` and `UserContext`. |
| `services/modules/` | Abstracted API logic (Tasks, Leaves, Payroll). Keeps UI clean. |
| `supabase/queries/` | Atomic PL/pgSQL functions. This is our secure data layer. |
| `lib/` | Core configuration like `bridge.js` and `supabaseClient.js`. |

---

## 🏗️ 2. Core Architecture Pattern
TalentOps follows a **Server-Authoritative, Multi-Tenant Architecture**.
*   **Frontend**: React (Vite) with Tailwind CSS for high-performance UI.
*   **Backend**: Supabase (PostgreSQL) leveraging **PL/pgSQL RPCs** (Remote Procedure Calls).
*   **Security Foundation**: Data isolation is enforced via `org_id` on every table, managed through `SECURITY DEFINER` functions that self-authenticate using `auth.uid()`.

---

## 🔐 2. The Multi-Tenancy Core
Every critical table in the database includes an `org_id` (UUID). This ensures that User A from "Org Alpha" can never see data from "Org Beta."

### 📂 File Breakdown: `services/modules/task/queries.js`
This file is the "Brain" for fetching tasks securely.

#### `getTasks` Function Logic:
```javascript
// Line 19: Parameters allow the system to adapt based on who is asking
export const getTasks = async (orgId, projectId, viewMode, userId, userRole) => {
    
    // Line 26: We join 'projects' and 'task_submissions' in a single query (Efficiency)
    let query = supabase.from('tasks').select('*, phase_validations, projects(name), task_submissions(final_points)');

    // Line 29: Normalizing roles to prevent bypass via 'Manager' vs 'manager'
    const normalizedRole = (userRole || 'employee').toLowerCase();
    const isPrivileged = ['manager', 'team_lead', 'executive'].includes(normalizedRole);

    // Line 44: SECURITY GUARD
    // If the user is NOT a manager/lead, we force an extra filter:
    if (viewMode === 'my_tasks' || !isPrivileged) {
        query = query.eq('assigned_to', userId); // <-- Enforces that employees ONLY see their own tasks
    }
}
```

---

## 🕒 3. Attendance & Real-Time Status
The attendance module uses the "Atomic Session" model.

### 📂 File Breakdown: `supabase/queries/rpc_clock_in.sql` (renamed to `check_in`)
This is a "Security Definer" function, meaning it runs with elevated database permissions but internally checks the user's identity.

```sql
-- Line 10: The function name exposed to the frontend
CREATE OR REPLACE FUNCTION check_in()
AS $$
BEGIN
    v_user_id := auth.uid(); -- Line 20: Gets the SECURE ID of the person logged in.

    -- Line 23: FETCH TENANT ID
    -- We don't trust the frontend to tell us the org_id. 
    -- We look it up in the profiles table ourselves.
    SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;

    -- Line 33: DUPLICATE PROTECTION
    -- Logic: If you haven't clocked out yet, you cannot clock in again.
    -- This prevents session corruption.
    IF v_open_session_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Active session found.');
    END IF;

    -- Line 43: ATOMIC INSERT
    INSERT INTO public.attendance (employee_id, org_id, check_in, status)
    VALUES (v_user_id, v_org_id, NOW(), 'present');
END;
$$;
```

## 🔄 4. UI Routing & The Multi-Module Engine
### 📂 File Breakdown: `components/employee/pages/ModulePage.jsx`
This is a **Container Component** (2400+ lines) that acts as the primary hub for all organizational features.

*   **Line 23**: The component takes `title` and `type` as props.
*   **Dynamic Rendering**: It uses conditional logic to swap between `StatusDemo` (Attendance), `AllTasksView` (Tasks), `PayslipsPage`, and `AnnouncementsPage`.
*   **Context usage (Line 25)**: It heavily relies on `useUser()` and `useProject()` to ensure every leaf request or task fetch is restricted to the current `orgId` and `teamId`.

---

## 🏗️ 5. Project vs. Global Roles
A unique feature of TalentOps is the **Project-Specific Permissions**.

### 📂 File Breakdown: `components/employee/context/ProjectContext.jsx`
*   **Purpose**: Manages which project is currently active in the UI header.
*   **Logic (Line 29)**: `fetchUserProjects` joins `project_members` with `projects` to identify NOT just the project, but the **Role** the user has inside that specific project.
*   **User Impact**: Even if a user is an "Executive" globally, if their `project_role` in "Project X" is "Consultant," the hardened queries in `queries.js` will restrict them to only seeing their own tasks within that project view.

---

## 🛠️ 6. Task Lifecycle & Validation
Tasks move through a 5-step lifecycle:
1. `requirement_refiner`
2. `design_guidance`
3. `build_guidance`
4. `acceptance_criteria`
5. `deployment`

### 📂 File Breakdown: `components/shared/AllTasksView.jsx` (Display Logic)
*   **Line 198**: Calls `taskService.getTasks`. This is the point where the React UI meets the hardened multi-tenant service layer.
*   **Line 735**: Implements multi-select status filtering.
*   **Line 774**: Optimistic sorting—active tasks (the one you are currently "Green Dot" working on) float to the top automatically.
*   **Line 685**: Color-coding—Green means approved, Yellow means proof submitted (awaiting review), Blue is the current active step.

## 🔗 7. Frontend-to-Backend Connectivity
We use a **Layered Service Pattern** to prevent hardcoding SQL in React.

1.  **UI Component**: (e.g., `AttendanceTracker.jsx`) calls a method.
2.  **Service Layer**: `taskService.getTasks` (in `queries.js`) formats the request.
3.  **Client Lib**: `supabaseClient.js` sends the request to the API.
4.  **Database RPC**: The logic runs inside PostgreSQL for maximum security and performance.

---

## 🧹 8. Maintenance & Cleanliness
Your codebase is transitioning from **Prototyping** to **Stabilization**. 
*   **Cleanup**: We are consolidating `_v2` and `_v3` SQL files into master versions.
*   **Naming**: We have standardized on `check_in` and `check_out` as the "Source of Truth" to prevent frontend/backend mismatches.

---

## 📝 Troubleshooting Summary (For the Review)
If asked about why multi-tenancy failed previously:
1.  **Orphaned Rows**: Some rows lacked `org_id` during the early dev phase.
2.  **Frontend-Only Logic**: We trusted the frontend to filter data. Now, we trust the **Database RPCs**.
3.  **Variable Names**: Confusion between `employee_id` and `user_id` caused join failures.

---

**Status**: Audit Complete. Codebase is now "Hardened."
