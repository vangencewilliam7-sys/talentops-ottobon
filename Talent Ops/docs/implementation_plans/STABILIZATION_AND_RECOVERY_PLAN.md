# 🛠️ Implementation Plan: System Stabilization & Recovery

## 📋 Overview
After a period of rapid prototyping and multiple direct SQL executions, the system has entered a "messy" state. This plan outlines a professional, step-by-step approach to audit, stabilize, and restore core functionalities, specifically focusing on **Multi-Tenancy**, **Attendance (Check-in)**, and **Database Cleanliness**.

---

## 📂 Implementation Plans Directory
You can find all historical and current implementation plans at:
`c:\Users\vardh\OneDrive\Desktop\t-ops\talentops-ottobon\Talent Ops\docs\implementation_plans\`

---

## 🚀 Phase 1: Diagnostic Audit (Immediate)
We must first understand "what was executed" and what is broken.

1.  **[ ] SQL Script Audit**: Review the 48+ files in `supabase/queries/`.
    *   *Action*: Identify which scripts were meant for production and which were temporary fixes.
    *   *Risk*: Multiple versions of the same RPC (e.g., `rpc_get_my_profile_v3.sql`) cause confusion and potential bugs if different parts of the app call different versions.
2.  **[ ] Tenant Integrity Check**:
    *   *Action*: Run a query to find any rows in `attendance`, `leaves`, or `tasks` that are missing an `org_id`.
    *   *Query*: `SELECT table_name, count(*) FROM (SELECT 'attendance' as table_name FROM attendance WHERE org_id IS NULL UNION ALL SELECT 'tasks' FROM tasks WHERE org_id IS NULL) group by table_name;`
3.  **[ ] RLS Verification**:
    *   *Action*: Check the live database state for Row Level Security.
    *   *Note*: Documentation suggests RLS is mostly disabled, relying on frontend filtering. This is a primary cause for multi-tenancy "messiness".

## 🛠️ Phase 2: Functional Recovery

### 1. Attendance System (Check-in/Out)
*   **Issue**: `clock_in()` and `clock_out()` RPCs are currently missing `org_id` logic, which can lead to users seeing or overwriting data from other organizations if auth tokens are misused.
*   **Step 1**: Update `rpc_clock_in.sql` to fetch `org_id` from the user's profile and insert it into the `attendance` record.
*   **Step 2**: Update `rpc_clock_out.sql` to filter by `org_id` when finding the active session.

### 2. Leave Management
*   **Issue**: `apply_leave()` fetches the balance but doesn't actually block requests that exceed it.
*   **Step 1**: Add a validation step in the PL/pgSQL function to return an error if `v_duration > v_balance`.

### 3. Multi-Tenancy Hardening
*   **Action**: Implement "Soft RLS" in all RPCs. Every `INSERT`, `UPDATE`, and `DELETE` within an RPC must explicitly include `WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())`.

## 🧹 Phase 3: Database & Code Cleanup

1.  **[ ] Consolidate RPCs**:
    *   Delete all `_v2`, `_v3`, etc., files.
    *   Maintain ONE definitive source file per RPC in a new organized folder structure: `supabase/migrations/current/`.
2.  **[ ] Standardize Frontend Calls**:
    *   Audit `TaskLifecyclePage.jsx` and `MyTasksPage.jsx` to ensure they always use the `orgId` from `UserContext`.
3.  **[ ] Restore Git Baseline**:
    *   Commit the current working state with a "Baseline for Stabilization" message.
    *   Use a separate branch `feature/stabilization` for these fixes.

---

## 🔒 Professional Standards to Follow
*   **No Placeholders**: All SQL must be production-ready with proper error handling (`EXCEPTION WHEN OTHERS`).
*   **Security Definer**: All RPCs must continue to use `SECURITY DEFINER` but with internal ownership checks.
*   **Atomic Transactions**: Multi-step operations (like creating a tenant) must use `BEGIN...COMMIT` blocks to prevent partial data states.

---

## 📅 Timeline
| Task | Effort | Priority |
| :--- | :--- | :--- |
| Diagnostic Audit | 2 hrs | 🔥 CRITICAL |
| Attendance Fixes | 1 hr | 🔥 CRITICAL |
| Leave Management Fixes | 1 hr | ✅ HIGH |
| SQL Consolidation | 3 hrs | 🟡 MEDIUM |
| RLS Hardening (Optional) | 4 hrs | 🔵 LOW |
