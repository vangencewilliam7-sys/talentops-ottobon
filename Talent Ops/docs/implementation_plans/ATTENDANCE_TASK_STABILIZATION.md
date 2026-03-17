# Implementation Plan: Attendance & Task Module Stabilization

## Objective
Revert attendance logic to use server-authoritative RPCs (consistent with user-created names), harden multi-tenancy in tasks, and resolve visibility bugs where employees see unauthorized tasks.

## 1. Attendance Module Alignment
Currently, the system uses "clock_in" and "clock_out" in SQL, but the frontend expects "check_in" and "check_out". We will also ensure hours calculation is performed server-side.

### 1.1 SQL RPC Renaming & Hardening
- **File**: `rpc_clock_in.sql`
  - Rename function from `clock_in()` to `check_in()`.
  - Maintain org_id fetching and open-session checks.
- **File**: `rpc_clock_out.sql`
  - Rename function from `clock_out()` to `check_out()`.
  - **New Feature**: Update the `total_hours` column in the `attendance` table during checkout.
  - Maintain status logic (half_day/present).

### 1.2 Frontend Sync
- **File**: `AttendanceTracker.jsx`
  - Ensure it calls `supabase.rpc('check_in')` and `check_out`. (Currently correct, but renaming backend to match).
  - Verify `get_my_attendance_status` RPC is correctly returning the needed fields.

## 2. Task Module Visibility Fix
Regular employees/consultants should only see tasks assigned to them. Managers/leads see all tasks in a project.

### 2.1 Task Query Hardening
- **File**: `queries.js` (Task Service)
  - Ensure `userRole` check is case-insensitive.
  - Add explicit check: If `viewMode` is 'default' and the user is an employee, force `assigned_to` filter.
  - Fix any argument order mismatches.

### 2.2 Component Audit
- **File**: `TeamTasksPage.jsx`
  - Ensure it correctly passes the project-level role, not the global organizational role.
- **File**: `MyTasksPage.jsx`
  - Refactor to use `taskService.getTasks` for consistency and to benefit from the same hardened logic.

## 3. Verification Steps
1. **Attendance**: 
   - Perform Check-In: Verify record creation with `org_id`.
   - Perform Check-Out: Verify `total_hours` is populated and status is set.
2. **Tasks**:
   - Login as Consultant: Switch projects and verify only personal tasks are visible in "My Tasks" and "Team Tasks" (if accessible).
   - Login as Manager: Verify all project tasks are visible.

---
**Status**: Ready for implementation.
