# Database Schema & Data Mapping

Below is the exhaustive list of the complete database architecture in the TalentOps application, strictly mapping **the exact 69 tables and 6 views** found currently in the live Supabase instance.

*Note: The `✅` in the Schema Verified column indicates confirmation against the project's source SQL schemas. `⚠️` indicates elements found in the live Supabase instance but without explicit exact documented columns in the source code yet.*

## 69 Active Tables (Comprehensive List)

| Table Name | Description | Exact Data Mapped (Columns) | Schema Verified |
|---|---|---|:---:|
| **`announcements`** | Organization-wide announcements. | `id`, `org_id`, `title`, `content`, `status`, `created_by`, `created_at`, `updated_at` | ✅ |
| **`attachments`** | Chat message attachments. | `id`, `message_id`, `file_name`, `file_type`, `file_size`, `storage_path`, `url`, `uploaded_at` | ✅ |
| **`attendance`** | Clock-in/out tracking. | `id`, `org_id`, `employee_id`, `date`, `clock_in`, `clock_out`, `current_task`, `created_at` | ✅ |
| **`candidates`** | Hiring and recruitment candidates. | *Undocumented in source SQL files* | ⚠️ |
| **`chat_history`** | Records of chat logs. | *Undocumented in source SQL files* | ⚠️ |
| **`clients`** | B2B clients or external agencies. | *Undocumented in source SQL files* | ⚠️ |
| **`company_details`** | Information specific to the overarching company. | *Undocumented in source SQL files* | ⚠️ |
| **`conversation_indexes`** | Optimizes chat inbox queries. | `conversation_id`, `last_message`, `last_message_at`, `updated_at` | ✅ |
| **`conversation_members`** | Maps profiles to conversations. | `id`, `conversation_id`, `user_id`, `is_admin`, `joined_at` | ✅ |
| **`conversations`** | Chat containers (DMs, Teams). | `id`, `org_id`, `type`, `name`, `created_by`, `created_at` | ✅ |
| **`departments`** | Available departments within an org. | `id`, `org_id`, `department_name` | ✅ |
| **`document_chunks`** | Semantic text chunks used for AI search/RAG. | *Undocumented in source SQL files* | ⚠️ |
| **`documents`** | Associated document records. | *Undocumented in source SQL files* | ⚠️ |
| **`employee_finance`** | Constant financial variables. | `id`, `org_id`, `employee_id`, `basic_salary`, `hra`, `allowances`, `professional_tax`, `is_active` | ✅ |
| **`employee_monthly_logs`** | Aggregated logs for periods. | *Undocumented in source SQL files* | ⚠️ |
| **`employee_performance_snapshots`**| Aggregations of an employee's performance. | *Undocumented in source SQL files* | ⚠️ |
| **`employee_reviews`** | Formal staff 360 or manager reviews. | *Undocumented in source SQL files* | ⚠️ |
| **`employee_skills`** | Individual map of skills an employee holds. | *Undocumented in source SQL files* | ⚠️ |
| **`employee_stage_history`** | State audit log for employee lifecycle status. | *Undocumented in source SQL files* | ⚠️ |
| **`extension_requests`** | Requests extending task or project deadlines. | *Undocumented in source SQL files* | ⚠️ |
| **`feedback`** | General application or process feedback. | *Undocumented in source SQL files* | ⚠️ |
| **`interviews`** | Hiring interview scheduling. | *Undocumented in source SQL files* | ⚠️ |
| **`invoice_emails`** | Transmitting invoice PDFs via email. | *Undocumented in source SQL files* | ⚠️ |
| **`invoice_items`** | Line-items inside an invoice. | *Undocumented in source SQL files* | ⚠️ |
| **`invoice_templates`** | Designs/presets for invoices. | *Undocumented in source SQL files* | ⚠️ |
| **`invoices`** | Client billing documentation records. | *Undocumented in source SQL files* | ⚠️ |
| **`job_descriptions`** | Specs mapped to individual jobs. | *Undocumented in source SQL files* | ⚠️ |
| **`jobs`** | Active postings or roles to fulfill. | *Undocumented in source SQL files* | ⚠️ |
| **`leave_ai_analysis`** | AI assessment of leave requests. | `id`, `leave_id`, `employee_id`, `org_id`, `analysis_data`, `risk_level`, `team_coverage_impact`... | ✅ |
| **`leave_audit_logs`** | State changes for a specific leave application. | *Undocumented in source SQL files* | ⚠️ |
| **`leaves`** | Employee leave requests. | `id`, `org_id`, `employee_id`, `from_date`, `to_date`, `reason`, `status`, `risk_score`, `created_at` | ✅ |
| **`message_reactions`** | Emoji reactions to messages. | `message_id`, `user_id`, `emoji` | ✅ |
| **`messages`** | Individual chat messages. | `id`, `conversation_id`, `sender_user_id`, `content`, `message_type`, `reply_to_id`, `created_at` | ✅ |
| **`notes`** | Miscellaneous internal notes. | *Undocumented in source SQL files* | ⚠️ |
| **`notifications`** | Realtime application alerts. | *Undocumented in source SQL files* | ⚠️ |
| **`offers`** | Hiring candidate offers. | *Undocumented in source SQL files* | ⚠️ |
| **`organization_memberships`**| Members mapped to organizations. | *Undocumented in source SQL files* | ⚠️ |
| **`orgs`** | Top-level tenant information (Supersedes `organizations`). | *Undocumented in source SQL files* | ⚠️ |
| **`payroll`** | Periodically calculated payslips. | `id`, `org_id`, `employee_id`, `month`, `basic_salary`, `hra`, `deductions`... | ✅ |
| **`payslips`** | Document records for payrolls. | *Undocumented in source SQL files* | ⚠️ |
| **`policies`** | Company HR documents policies. | *Undocumented in source SQL files* | ⚠️ |
| **`poll_votes`** | Votes cast by users on polls. | `id`, `poll_option_id`, `user_id` | ✅ |
| **`profiles`** | App-specific user data. | `id`, `org_id`, `email`, `full_name`, `role`, `job_title`, `department`, `technical_scores`... | ✅ |
| **`project_documents`** | Docs related directly to projects. | *Undocumented in source SQL files* | ⚠️ |
| **`project_members`** | Maps profiles to projects & roles. | `id`, `org_id`, `project_id`, `user_id`, `role` | ✅ |
| **`project_time_logs`** | Summarized logged hours for a project. | *Undocumented in source SQL files* | ⚠️ |
| **`projects`** | High-level containers for tasks. | `id`, `org_id`, `name`, `status` | ✅ |
| **`semantic_cache`** | Caching layer for fast AI similarity lookups. | *Undocumented in source SQL files* | ⚠️ |
| **`skills_master`** | Master dictionary of skills. | `id`, `name`, `description`, `category` | ✅ |
| **`task_audit`** | State and change logs for tasks. | *Undocumented in source SQL files* | ⚠️ |
| **`task_evidence`** | User uploaded assets to verify a completed task. | *Undocumented in source SQL files* | ⚠️ |
| **`task_feedback`** | Direct comments regarding a task's progress. | *Undocumented in source SQL files* | ⚠️ |
| **`task_notes`** | Simple ad-hoc descriptions for a task. | *Undocumented in source SQL files* | ⚠️ |
| **`task_reviews`** | Formal assessments of a completed task. | *Undocumented in source SQL files* | ⚠️ |
| **`task_risk_snapshots`** | Point in time snapshots capturing AI risk probabilities. | *Undocumented in source SQL files* | ⚠️ |
| **`task_skills`** | Skills directly correlated to a given task. | *Undocumented in source SQL files* | ⚠️ |
| **`task_stage_history`** | State audit for a task's progression through stages. | *Undocumented in source SQL files* | ⚠️ |
| **`task_stages`** | Distinct workflow stages. | *Undocumented in source SQL files* | ⚠️ |
| **`task_state_history`** | Event logs of task state alterations. | *Undocumented in source SQL files* | ⚠️ |
| **`task_steps`** | Granular task checklists. | `id`, `org_id`, `task_id`, `stage_id`, `step_title`, `status`, `completed_at`... | ✅ |
| **`task_submission_skills`**| Skills verified directly out of a particular submission. | *Undocumented in source SQL files* | ⚠️ |
| **`task_submissions`** | Completion data/points for tasks. | `id`, `task_id`, `student_id`, `actual_hours`, `final_points`, `bonus_points`, `penalty_points` | ✅ |
| **`tasks`** | Core unit of work assignments. | `id`, `project_id`, `title`, `description`, `assigned_to`, `status`, `allocated_hours`... | ✅ |
| **`team_financials`** | Aggregated budgets running across whole teams. | *Undocumented in source SQL files* | ⚠️ |
| **`team_members`** | Join/map of profiles directly to teams. | *Undocumented in source SQL files* | ⚠️ |
| **`teams`** | Groupings of profiles generally. | *Undocumented in source SQL files* | ⚠️ |
| **`tickets`** | Support or service request submissions. | *Undocumented in source SQL files* | ⚠️ |
| **`time_logs`** | Precise hour entries. | *Undocumented in source SQL files* | ⚠️ |
| **`timesheets`** | Bundles of logs submitted periodically for review. | *Undocumented in source SQL files* | ⚠️ |

---

## 6 Live Database Views

*(Views are virtual tables generated by a stored query, which is why they are counted separately from "Tables" in the dashboard header).*

| View Name | Description |
|---|---|
| **`employee_rankings_view`** | Computed rankings of employees based on their scores. |
| **`project_work_summary`** | Aggregates of a project's completion state. | 
| **`v_resource_gaps`** | Query spotting lacking resources based on capacity mapping. |
| **`v_team_analytics`** | Output computations covering team productivity. | 
| **`view_assignable_employees`**| Exposing active logic who can grab an unassigned task. | 
| **`view_employee_aggregate_performance`**| Combining skill growth & task points over time matrices. |
