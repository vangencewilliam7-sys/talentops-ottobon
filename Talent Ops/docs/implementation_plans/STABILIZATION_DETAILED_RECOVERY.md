# 🏗️ Detailed Implementation Plan: System Stabilization & Recovery

> **Date:** March 13, 2026  
> **Status:** 🔴 CRITICAL RECOVERY  
> **Focus:** Multi-Tenancy Hardening, Attendance Logic, SQL Cleanliness

---

## 📋 Executive Summary
The TalentOps platform has reached a state of high technical entropy due to rapid prototyping and ad-hoc SQL execution. Core multi-tenant guards have been bypassed, and the attendance system is failing to correctly isolate data. This document outlines a granular, professional transition from "Prototyping" to "Production Stability."

---

## 📂 Implementation Resource Map
Historical and existing plans are located in:  
`c:\Users\vardh\OneDrive\Desktop\t-ops\talentops-ottobon\Talent Ops\docs\implementation_plans\`

---

## 🛠️ Issue 1: Broken Attendance (Check-in)
**Status:** ❌ BROKEN  
**Behavior:** `clock_in()` and `clock_out()` are partially functioning but failing to record or filter by `org_id`, leading to data leakage between tenants.

### 📝 The Fix: Tenant-Aware RPCs
We must update the PL/pgSQL functions to be "Self-Authenticating."

#### Before (Vulnerable)
```sql
INSERT INTO public.attendance (employee_id, date, check_in) 
VALUES (v_user_id, CURRENT_DATE, NOW());
```

#### After (Hardened)
```sql
-- Fetch the organization ID from the profile during execution
SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;

INSERT INTO public.attendance (
    employee_id, 
    org_id, -- CRITICAL: Record the tenant
    date, 
    check_in,
    status
) VALUES (
    v_user_id,
    v_org_id,
    CURRENT_DATE,
    NOW(),
    'present'
);
```

---

## 🔐 Issue 2: Multi-Tenancy "Southward" Drift
**Status:** ⚠️ FRAGILE  
**Symptoms:** New tenants created via `create-tenant-org` are not correctly isolated across all tables.

### 📋 Multi-Tenancy Recovery Checklist
| Task | Action | Status |
| :--- | :--- | :--- |
| **Audit `org_id`** | Run integrity query: `SELECT count(*) FROM attendance WHERE org_id IS NULL;` | ⬜ TODO |
| **Backfill Data** | Update existing rows missing `org_id` based on `profiles` link. | ⬜ TODO |
| **Enforce Soft-RLS** | Update every RPC in `supabase/queries/` to include `WHERE org_id = ...` | ⬜ TODO |
| **Context Extraction** | Ensure `TaskLifecyclePage.jsx` uses `orgId` from `UserContext` exclusively. | ⬜ TODO |

---

## 🧹 Issue 3: The "Supabase SQL Mess"
**Status:** 🌑 MESSY  
**Count:** 48+ files in `supabase/queries/` including redundant `_v2`, `_v3` versions.

### 🗑️ Cleanup Strategy (Step-by-Step)
1. **[ ] Migration Export**: Extract the *currently live* function signatures from the Supabase Dashboard.
2. **[ ] Version Consolidation**: 
   * Move `rpc_get_my_profile.sql`, `_v2`, and `_v3` into a single `PROFILES_MASTER.sql`.
   * Delete redundant files from the local directory.
3. **[ ] Migration Folder Pattern**:
   ```
   supabase/
   ├── migrations/
   │   ├── 001_core_schema.sql
   │   ├── 002_attendance_fix.sql
   │   └── 003_leave_validation.sql
   └── queries/ (ONLY for scratchpad testing)
   ```

---

## 🔬 Phase 1: Immediate Diagnostic Actions
Instead of blindly executing more SQL, we will perform a **ReadOnly Audit** first.

### Step 1: Data Integrity Audit
I will execute a diagnostic query to see exactly which tables have "leaked" across tenants:
```sql
SELECT 
    'attendance' as table, count(*) filter (where org_id is null) as missing_org_id
FROM attendance
UNION ALL
SELECT 
    'tasks', count(*) filter (where org_id is null)
FROM tasks
UNION ALL
SELECT 
    'leaves', count(*) filter (where org_id is null)
FROM leaves;
```

---

## 🔒 Professional Engineering Standards
*   **Security Definer vs Invoker**: We will standardize all RPCs to use `SECURITY DEFINER` only when necessary, with internal ID validation.
*   **Atomic Deployments**: No more "one-off" SQL edits. Changes must be committed to Git *before* being applied to Supabase.
*   **Error Bubbling**: UI components must use `.error` properties from RPC returns to show toast notifications instead of failing silently.

---

## 📅 Stabilisation Timeline
1. **Hour 1-2**: Audit and Backfill (Recover missing `org_id`s).
2. **Hour 3-4**: Attendence & Leave Fixes (Hardening the logic).
3. **Hour 5-8**: SQL Consolidation (Cleaning the `queries/` folder).

---

## 💬 Stakeholder Review & Feedback
*Use this section to add your notes, questions, or specific requirements. Antigravity will review this section before each execution step.*

| Date | User Comment | Antigravity Response | Status |
| :--- | :--- | :--- | :--- |
| 2026-03-13 | *Add your comment here...* | | ⏳ Filtered |

---

## 📝 Developer Notes / Workspace Log
*Record any ad-hoc decisions or "messy" discoveries here for the final audit.*

- [ ] 
