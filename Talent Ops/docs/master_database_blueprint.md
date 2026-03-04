# The TalentOps Master Database Blueprint
*A completely exhaustive, live-validated architectural map of the entire Supabase backend.*

---

## Part 1: Status Summary & Validation
Based on direct validation between your local codebase and the live Supabase dashboard row checks:
*   **Total Live Tables:** 69
*   **Total Live Views:** 6
*   **Total Live Storage Buckets:** 8
*   **Total Live SQL Functions (RPCs):** 6 *(Note: ~38 other functions exist locally but remain undeployed)*
*   **Total Edge Functions:** 2

**Live Table Health Analysis:**
*   `33 Tables` are **Completely Empty (0 rows)**. Specifically, Candidate ATS tracking, B2B Invoicing, and highly redundant audit logging sections are unused. These modules can be dropped or ignored.
*   `Approx 20 Tables` have **1-2 Rows**. These are your **Core Essential Tables** holding dummy initialization data (e.g., your admin profile, one test company). **Do NOT delete these.**

---

## Part 2: The Complete 69 Table Architecture Map

Below is every single active table, exactly what data it maps, what storage buckets it triggers, and its validated necessity status based on the live row audits.

| Table Name | Exact Data Mapped (Columns) | Necessity Status | Connected Storage / Logic |
|---|---|:---:|---|
| **`announcements`** | `id`, `org_id`, `title`, `content`, `status`, `created_by`... | **Core** | None |
| **`attachments`** | `id`, `message_id`, `file_name`, `url`, `storage_path`... | **Core** | `message-attachments` Bucket |
| **`attendance`** | `id`, `org_id`, `employee_id`, `date`, `clock_in`, `clock_out`... | **Core** | None |
| **`candidates`** | *(Dormant Optional Module)* | 🗑️ *Empty (Drop Safe)* | `resumes` Bucket |
| **`chat_history`** | *(Dormant Audit Table)* | 🗑️ *Empty (Drop Safe)* | None |
| **`clients`** | *(Dormant Invoicing Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`company_details`** | *(Initialization Data)* | **Core** *(Sparse)* | None |
| **`conversation_indexes`** | `conversation_id`, `last_message`, `last_message_at`... | **Core** | *Aggregation Target* |
| **`conversation_members`** | `id`, `conversation_id`, `user_id`, `is_admin`, `joined_at` | **Core** | None |
| **`conversations`** | `id`, `org_id`, `type`, `name`, `created_by`, `created_at` | **Core** | None |
| **`departments`** | `id`, `org_id`, `department_name` | **Core** | None |
| **`document_chunks`** | *(AI Rag Module - Embeddings)* | 🟡 *Depends on AI Use* | Vector Indexes |
| **`documents`** | *(AI Rag Module - Context)* | 🟡 *Depends on AI Use* | None |
| **`employee_finance`** | `id`, `org_id`, `employee_id`, `basic_salary`, `hra`... | **Core** | None |
| **`employee_monthly_logs`** | *(Dormant Logs)* | 🗑️ *Empty (Redundant)* | None |
| **`employee_performance_snapshots`**| *(Dormant Logs)* | 🗑️ *Empty (Redundant)* | None |
| **`employee_reviews`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`employee_skills`** | *(Dormant Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`employee_stage_history`** | *(Dormant Audit Table)* | 🗑️ *Empty (Redundant)* | None |
| **`extension_requests`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`feedback`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`interviews`** | *(Dormant Optional Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`invoice_emails`** | *(Dormant Invoicing Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`invoice_items`** | *(Dormant Invoicing Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`invoice_templates`** | *(Dormant Invoicing Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`invoices`** | *(Dormant Invoicing Module)* | 🗑️ *Empty (Drop Safe)* | `invoices` Bucket |
| **`job_descriptions`** | *(Dormant Optional Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`jobs`** | *(Dormant Optional Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`leave_ai_analysis`** | `id`, `leave_id`, `analysis_data`, `risk_level`... | **Core** | **Edge Fn:** `analyze-task-risk` |
| **`leave_audit_logs`** | *(Dormant Audit Table)* | 🗑️ *Empty (Redundant)* | None |
| **`leaves`** | `id`, `org_id`, `employee_id`, `from_date`, `to_date`... | **Core** | None |
| **`message_reactions`** | `message_id`, `user_id`, `emoji` | **Core** | None |
| **`messages`** | `id`, `conversation_id`, `sender_user_id`, `content`... | **Core** | `message-attachments` Bucket |
| **`notes`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`notifications`** | *(Realtime Layer)* | **Core** | Supabase Realtime App |
| **`offers`** | *(Dormant Optional Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`organization_memberships`**| *(Dormant Duplicate Mapping)* | 🗑️ *Empty (Redundant)* | None |
| **`orgs`** | `id`, `name`, `created_at` *(Supersedes organizations)*| **Core** *(Sparse)* | None |
| **`payroll`** | `id`, `org_id`, `employee_id`, `month`, `basic_salary`... | **Core** | `payslips` Bucket |
| **`payslips`** | *(Dormant Documents Table)* | 🗑️ *Empty (Drop Safe)* | `payslips` Bucket |
| **`policies`** | *(Dormant Documents Table)* | 🟡 *Depends on Usage* | `policies` Bucket |
| **`poll_votes`** | `id`, `poll_option_id`, `user_id` | **Core** | None |
| **`profiles`** | `id`, `org_id`, `email`, `full_name`, `role`, `avatar_url`... | **Core** *(Sparse)* | `avatars` Bucket |
| **`project_documents`** | *(Dormant Documents Table)* | 🗑️ *Empty (Drop Safe)* | `project-docs` Bucket |
| **`project_members`** | `id`, `org_id`, `project_id`, `user_id`, `role` | **Core** | None |
| **`project_time_logs`** | *(Dormant Logs)* | 🗑️ *Empty (Redundant)* | None |
| **`projects`** | `id`, `org_id`, `name`, `status` | **Core** *(Sparse)* | `project-docs` Bucket |
| **`semantic_cache`** | *(AI Rag Module)* | 🟡 *Depends on AI Use* | None |
| **`skills_master`** | `id`, `name`, `description`, `category` | **Core** | None |
| **`task_audit`** | *(Dormant Audit Table)* | 🗑️ *Empty (Redundant)* | None |
| **`task_evidence`** | *(Empty - Needs UI Fix)* | 🔴 *Broken Flow* | `task-proofs` Bucket |
| **`task_feedback`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`task_notes`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`task_reviews`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`task_risk_snapshots`** | *(Dormant AI Feature)* | 🗑️ *Empty (Redundant)* | None |
| **`task_skills`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`task_stage_history`** | *(Dormant Audit Table)* | 🗑️ *Empty (Redundant)* | None |
| **`task_stages`** | *(Empty - Needs UI Fix)* | 🔴 *Broken Flow* | None |
| **`task_state_history`** | *(Audit Table)* | 🗑️ *Empty (Redundant)* | None |
| **`task_steps`** | `id`, `task_id`, `step_title`, `status`... | **Core** | None |
| **`task_submission_skills`**| *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`task_submissions`** | *(Empty - Needs UI Fix)* | 🔴 *Broken Flow* | Triggers points calc |
| **`tasks`** | `id`, `project_id`, `title`, `description`, `status`... | **Core** *(Sparse)* | **Edge Fn:** `generate-task` |
| **`team_financials`** | *(Dormant Financial Module)* | 🗑️ *Empty (Drop Safe)* | None |
| **`team_members`** | *(Dormant Profile Mapping)* | 🗑️ *Empty (Redundant)* | None |
| **`teams`** | *(Empty - Needs UI Fix)* | 🔴 *Broken Flow* | None |
| **`tickets`** | *(Dormant Feature)* | 🗑️ *Empty (Drop Safe)* | None |
| **`time_logs`** | *(Dormant Logs)* | 🗑️ *Empty (Redundant)* | None |
| **`timesheets`** | *(Dormant Logs)* | 🗑️ *Empty (Redundant)* | None |

---

## Part 3: Live View List (6 Virtual Tables)
1.  `employee_rankings_view`
2.  `project_work_summary`
3.  `v_resource_gaps`
4.  `v_team_analytics`
5.  `view_assignable_employees`
6.  `view_employee_aggregate_performance`

---

## Part 4: The 8 Supabase Storage Buckets
*   **`task-proofs`** -> Secured (Authenticated). Connected to `task_evidence`.
*   **`project-docs`** -> Secured (Authenticated). Connected to `project_documents`.
*   **`policies`** -> Secured (Authenticated). Connected to `policies`.
*   **`avatars`** -> **Public Read Allowed**. Connected to profile avatars.
*   **`resumes`** -> Secured (Authenticated). Connected to `candidates`.
*   **`invoices`** -> Secured (Authenticated). Built for billing PDFs.
*   **`payslips`** -> Secured (Authenticated). Built for payroll PDFs.
*   **`message-attachments`** -> Secured (Authenticated). Holds chat images.

---

## Part 5: Deno Edge Functions (Serverless AI)
Stored in local repo `supabase/functions/` and leveraging OpenAI outputs:
1.  **`analyze-task-risk`**: Activated on leave requests to dictate bottleneck risks to the team. Logs results to `leave_ai_analysis`.
2.  **`generate-task-plan`**: Triggered from new tasks to auto-generate the step-by-step arrays natively mapped into `task_steps`.

---

## Part 6: PostgreSQL Remote Procedure Calls (RPCs / Functions)

🔴 **MAJOR VALIDATION FINDING:** 
Your dashboard shows exactly **6 Deployments**, but the local `.sql` codebase holds exactly **44 distinct functions**. This means 38 custom logic hooks developed locally (like `apply_leave()`, `clock_in()`, `generate_monthly_payroll()`) have not been pushed to the live server.

**The 6 Known Deployed Functions:**
1.  **`get_table_schema`**: A UI utility reflection function.
2.  **`calculate_task_points`**: Calculates score logic post-submission.
3.  **`update_task_points_trigger`**: Wraps the calculation trigger.
4.  **`get_user_performance_stats`**: Retrieves data for the aggregation views.
5.  **`rpc_compute_task_risk_metrics`**: A helper function linking to the Deno AI edge function.
6.  *(Internal standard timestamp or authentication wrappers)*
