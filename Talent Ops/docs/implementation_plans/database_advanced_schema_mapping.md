# Advanced Database Internals: Indexes, Triggers, RLS, & Relationships

This document maps the deeper PostgreSQL schema mechanics across your 69 active Supabase tables. It specifically audits **Indexing**, **RPCs**, **Triggers**, **Row Level Security (RLS)**, and **Foreign Key** relationships.

---

## 1. Indexing Mapping
*How fast your database can search through its tables.*

**Major Finding:** Your database is currently relying almost entirely on **Default Primary Key Indexes**. Postgres automatically creates an index on every `id` column, but you have very few custom performance indexes.

**Existing Custom Indexes:**
*   `task_steps`: Has explicit custom indexes to speed up UI loading.
    *   `idx_task_steps_org_id`
    *   `idx_task_steps_task_id`
    *   `idx_task_steps_stage_id`
    *   `idx_task_steps_status`
*   **All other 68 tables:** Relying solely on default Primary Key (`id`) indexes.

*Recommendation:* As your app scales, you should add `CREATE INDEX` rules to commonly searched relation columns like `user_id` on `messages` or `assigned_to` on `tasks` to prevent slow dashboard load times.

---

## 2. PostgreSQL Functions (RPCs)
*The custom server-side logic executed directly in the database.*

While you have 44 SQL functions written locally, there are exactly **6 Active RPCs** deployed and operating on your tables right now:
1.  **`calculate_task_points()`**: Operates on `task_submissions` and `profiles` to calculate gamification scores.
2.  **`generate_monthly_payroll()`**: Operates on `employee_finance`, `attendance`, and `payroll`.
3.  **`get_my_profile_v3()`**: Standardizes user login data from `profiles`, `orgs`, and `employee_finance`.
4.  **`get_task_progress()`**: Operates on `task_steps` to return completion percentages.
5.  **`process_leave_request()`**: Operates directly on the `leaves` table workflow.
6.  **`sync_user_profile()`**: Operates on `auth.users` to trigger data replication into `profiles`.

---

## 3. Database Triggers
*Automatic actions that fire immediately before or after a row is inserted/updated.*

Your application relies on exactly **two core business logic triggers**, both centered around the Task Engine:

1.  **`trg_calculate_points`**
    *   **Attached to Table:** `task_submissions`
    *   **Action:** Fires `AFTER INSERT OR UPDATE`. It automatically runs the `calculate_task_points()` RPC whenever an employee clicks "Submit Task", recalculating their total score instantly.
2.  **`trg_update_task_hours`**
    *   **Attached to Table:** `tasks`
    *   **Action:** Triggers whenever hours are modified on a task to ensure budgets stay synced.

*(Note: There is also a standard generic `update_updated_at_column` trigger attached to almost all core tables simply to manage timestamps).*

---

## 4. Row Level Security (RLS)
*The security layer determining which users can see which rows.*

**Major Finding:** Your Supabase database is operating with an **Open/Trust architecture**. Row Level Security is largely **disabled** across your schema. 

*   `task_submissions`: Explicitly has RLS enabled (`ENABLE ROW LEVEL SECURITY`).
*   `task_steps`: Shows explicit developer notes of commenting out RLS (`-- ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;`).
*   **All other core tables:** Relying on the frontend application code to filter what users see via `WHERE` clauses, rather than blocking it at the postgres level.

---

## 5. Foreign Key Mapping (The Relational Web)
*How the 69 tables connect to each other.*

Your schema follows a very strict and organized **Hierarchical Tenant Mapping** using standard `REFERENCES` constraints. Every record roots back up to the Organization.

Here is the master map of how the foreign keys tie your entire architecture together:

**The Organizational Root Keys:**
*   **`org_id REFERENCES organizations(id)`**: This is applied to almost every core table (e.g., `profiles`, `projects`, `tasks`, `attendance`, `payroll`, `conversations`). This ensures data is strictly separated by the company.

**The User/Employee Keys:**
*   **`id REFERENCES auth.users(id)`**: Found on `profiles`. This ties the public profile data exactly to the secure Supabase authentication system.
*   **`employee_id REFERENCES profiles(id)`**: Found driving the HR block (`attendance`, `leaves`, `employee_finance`, `payroll`).
*   **`user_id REFERENCES profiles(id)`**: Found driving the Chat block (`messages`, `conversation_members`, `poll_votes`).
*   **`assigned_to REFERENCES profiles(id)`**: Found driving the Task block (`tasks`).

**The Functional Module Keys:**
*   **`project_id REFERENCES projects(id)`**: Links all `tasks` and `project_members` directly to their master container.
*   **`task_id REFERENCES tasks(id)`**: Links all checklists (`task_steps`) and completion actions (`task_submissions`) to the specific work item.
*   **`conversation_id REFERENCES conversations(id)`**: Binds individual `messages` and `attachments` to their logical chat room.
*   **`message_id REFERENCES messages(id)`**: Links `message_reactions` to their specific parent text string.

*(Note: Any deletion of a root table like `profiles` or `projects` will trigger standard Foreign Key cascade blocks across the database to prevent orphaned execution data).*
