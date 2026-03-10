# Technical Master: TalentOps Logic Layer & RPC Catalog

## 🏗️ Architectural Core: Logical Integrity
TalentOps operates on a **Logic-Authoritative** model. The database is the **CPU** of the organization's business rules.

### **The Global Pattern**
1. **Request**: UI calls `supabase.rpc('function_name', { params })`.
2. **Identity**: `SECURITY DEFINER` + `auth.uid()` ensures zero-bypass authentication.
3. **Execution**: PL/pgSQL Atomic Transactions.
4. **Resolution**: Structured JSON return `{ "success": boolean, "data": jsonb, "error": text }`.

---

## 📅 1. Attendance & High-Integrity Timekeeping
**Goal**: Prevent clock-masking and session fraud.

### `clock_in()` & `clock_out()`
- **Signature**: `RETURNS json` | `SECURITY DEFINER`
- **Logic**: 
  - Validates `auth.uid()` against existing open sessions (`check_out IS NULL`).
  - Injects server-side `NOW()` to prevent client clock manipulation.
  - Automatically normalizes to **IST (Asia/Kolkata)**.

---

## 📊 2. Task Lifecycle & Points Engine
**Goal**: Move tasks through a strictly audited pipeline with automated merit rewards.

### `trg_calculate_points()` (Trigger)
- **Source**: [calculate_task_points.sql](file:///c:/Users/vardh/OneDrive/Desktop/t-ops/talentops-ottobon/Talent%20Ops/triggers/calculate_task_points.sql)
- **Logic Breakdown**:
  1. **Early Completion**: `Bonus = (Allocated - Actual) * Base_Rate`.
  2. **Late Completion**: `Penalty = (Actual - Allocated) * Penalty_Rate`.
  3. **Immutability**: Once `actual_hours` is inserted, the `final_points` are locked.
- **SQL Snippet**:
```sql
v_hours_diff := v_allocated_hours - v_actual_hours;
v_bonus_pts := v_hours_diff * COALESCE(v_points_per_hour, 0);
v_final_pts := v_total_points + v_bonus_pts;
```

### `handle_task_lifecycle(p_task_id, p_action, p_payload)`
- **The Engine**: Orchestrates transitions between `Backlog` -> `In Progress` -> `Validation Pending` -> `Approved/Rejected`.
- **RBAC**: Ensures only assigned employees can submit proof, and only managers/leads can approve.

---

## 🤖 3. AI Planning & Risk Engine: Contextual Inference
**Goal**: Use mathematical projection to trigger proactive human intervention.

### `rpc_compute_task_risk_metrics(p_task_id)`
- **Source**: [fix_ai_progress_metrics.sql](file:///c:/Users/vardh/OneDrive/Desktop/t-ops/talentops-ottobon/Talent%20Ops/fix_ai_progress_metrics.sql)
- **Math Logic**:
  - `v_progress_ratio := v_steps_completed::numeric / v_total_steps` (if steps exist).
  - **Fallback**: Parses `phase_validations` JSONB array to count `'approved'` keys.
  - `v_predicted_total := v_elapsed_hours / v_progress_ratio`.
  - `v_predicted_delay := GREATEST(0, v_predicted_total - v_task.allocated_hours)`.

### `rpc_bulk_save_task_plan(p_task_id, p_steps, p_ai_metadata)`
- **Source**: [feature_ai_planning_migration.sql](file:///c:/Users/vardh/OneDrive/Desktop/t-ops/talentops-ottobon/Talent%20Ops/feature_ai_planning_migration.sql)
- **Transactional Atomicity**:
  1. Updates `tasks.ai_metadata`.
  2. Loops through `p_steps` array and `INSERT`s into `task_steps`.
  3. Bulk-updates `tasks.allocated_hours` and `tasks.task_points` (`Hours * 10`) in a single statement.

---

## 💰 4. Atomic Payroll & Financial Accuracy
**Goal**: 100% precision in organization-wide disbursements.

### `generate_monthly_payroll(p_month, p_working_days)`
- **Source**: [rpc_generate_monthly_payroll.sql](file:///c:/Users/vardh/OneDrive/Desktop/t-ops/talentops-ottobon/Talent%20Ops/rpc_generate_monthly_payroll.sql)
- **Core Loop**:
```sql
FOR v_emp IN SELECT id, basic_salary... FROM profiles LEFT JOIN employee_finance...
LOOP
    v_daily_rate := (v_basic + v_hra + v_allowances) / 30;
    v_lop_deduction := v_daily_rate * v_lop_days;
    v_net_salary := v_gross - v_lop_deduction - v_prof_tax;
    INSERT INTO payroll (...) VALUES (...);
END LOOP;
```

---

## 🏥 5. Leave & Availability Management
**Goal**: Enforce strict bucket limits and prevent double-booking.

### `apply_leave(p_from, p_to, p_reason)`
- **Logical Guard**: Uses the PostgreSQL `OVERLAPS` operator to check against existing pending/approved requests.
- **Auto-Sync**: If approved via `approve_leave()`, it atomically updates the `attendance` status for those dates.

---

## 🔒 Security Protocol
1. **Zero-Trust Identity**: `auth.uid()` is used within the function, never passed from React.
2. **Multi-Tenancy**: `WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())` is a mandatory filter for EVERY query.
3. **Escalation**: Uses `SECURITY DEFINER` to bypass RLS for critical system updates (like points or payroll) while maintaining audit trails.
