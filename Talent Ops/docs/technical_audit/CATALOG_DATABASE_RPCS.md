# 🗄️ Database Master Catalog: Every SQL Function Explained

This catalog documents the 49+ server-side scripts that power the TalentOps backend. These files are located in `supabase/queries/`.

---

## 🕒 Attendance & Session Logic
These files ensure that time tracking is accurate and impossible to manipulate from the browser.

*   **`rpc_clock_in.sql`**  
    *   **Logic**: Records a session start. It explicitly fetches `org_id` from the profiles table (Self-Authenticating) to ensure multi-tenancy.
*   **`rpc_clock_out.sql`**  
    *   **Logic**: Calculates `total_hours` using server time (`NOW() - check_in`) and updates the row status to 'present' or 'half_day'.
*   **`rpc_get_attendance_status.sql`**  
    *   **Logic**: A helper for the dashboard that returns the current day's active session state in a single JSON call.
*   **`rpc_team_attendance.sql`**  
    *   **Logic**: Used by Managers to see who is currently "Active" vs. "On Break" across the whole team.

---

## 📊 Profiles & Multi-Tenancy
*   **`rpc_get_my_profile_v1/v2/v3.sql`**  
    *   **History**: Evolved from a simple profile fetch to a complex aggregator.
    *   **Logic (v3)**: Aggregates basic info, department name, project assignments, and finance/salary data into one object.
*   **`rpc_update_my_profile_v2.sql`**  
    *   **Logic**: Allows users to update their own phone/location while protecting critical fields like `role` or `org_id` from unauthorized changes.

---

## 💰 Payroll & Leave Management
*   **`rpc_generate_monthly_payroll.sql`**  
    *   **Logic**: A "Batch Processor." It loops through all employees, calculates their performance points, adds base salary, and creates `payroll` records for the month.
*   **`rpc_apply_leave.sql`** / **`rpc_approve_leave.sql`**  
    *   **Logic**: Manages the state machine for leaves (Pending → Approved). Validation logic prevents employees from approving their own leaves.
*   **`rpc_organization_holidays.sql`**  
    *   **Logic**: Fetches company-wide holidays so that the business hour math can skip them.

---

## 🤖 AI & Progress Metrics
*   **`fix_ai_progress_metrics.sql`**  
    *   **Logic**: A diagnostic script that recalculated the percentage of project completion across inconsistent task sets.
*   **`feature_ai_planning_migration.sql`**  
    *   **Logic**: Added new columns for AI-suggested risks and assumptions to the `tasks` table.

---

## ⚡ Automation (Triggers)
Located in `supabase/queries/triggers/`.

*   **`calculate_task_points.sql`**  
    *   **Type**: `BEFORE INSERT OR UPDATE` Trigger.
    *   **Logic**: Every time a task is marked as "Submitted," this script fires. It compares `actual_hours` vs `allocated_hours`. If the user is early, it generates **Bonus Points**; if late, it applies a math-based penalty.

---

## 🧹 Maintenance & Cleanup
*   **`final_aggressive_cleanup.sql`**  
    *   **Purpose**: A recovery script that drops legacy, broken triggers from previous prototyping sessions to ensure the database remains "Clean."
*   **`safe_populate_skills.sql`**  
    *   **Purpose**: Pre-fills the database with 100+ standardized skills (React, SQL, Python) so the "Skill Tag" UI has data to search from day one.
