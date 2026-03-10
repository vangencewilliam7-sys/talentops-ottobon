# Database Trigger Mapping

This document explicitly maps the **PostgreSQL Triggers** executing automatic business logic across the 69 tables in the live Supabase database.

*(Note: Triggers are automatic actions that fire immediately before or after a row is inserted, updated, or deleted. They act as the database's automatic nervous system.)*

---

## ⚡ Active Custom Business Logic Triggers

These are the custom-written triggers that handle complex application state changes. Your database relies on exactly **two core business logic triggers**, both centered around the Task Engine module.

| Trigger Name | Attached Table | Firing Event | Action Performed |
|---|---|---|---|
| **`trg_calculate_points`** | `task_submissions` | `AFTER INSERT OR UPDATE` | Instantly runs the `calculate_task_points()` RPC whenever an employee clicks "Submit Task", recalculating their total gamification score based on hours and skills. |
| **`trg_update_task_hours`** | `tasks` | `AFTER INSERT OR UPDATE` | Automatically catches any modifications to the `allocated_hours` or `actual_hours` on a task, ensuring budgets stay mathematically synced across the underlying SQL calculations. |

---

## 🕒 Generic Timestamps Triggers (System Standard)

Almost every standard data table in the Supabase schema shares a singular, generic trigger used purely for row-level system maintenance. 

| Trigger Name | Attached Tables | Firing Event | Action Performed |
|---|---|---|---|
| *(Various timestamp triggers)* | Most Core Tables | `BEFORE UPDATE` | Automatically intercepts the update command and overwrites the `updated_at` timestamp column to `NOW()`. This guarantees the timestamp is always accurate, regardless of what the frontend React code attempts to send. |

---

## 🚫 Tables Operating WITHOUT Custom Business Triggers

The remaining **67 tables** do not have any complex custom business logic Triggers attached to them. They rely entirely on standard CRUD operations without intercepting the inserts or updates for deeper side-effects.

**Organization & User Data (No Custom Triggers):**
*   `company_details`
*   `departments`
*   `employee_finance`
*   `employee_performance_snapshots`
*   `employee_reviews`
*   `employee_skills`
*   `employee_stage_history`
*   `organization_memberships`
*   `orgs`
*   `profiles`
*   `skills_master`
*   `team_financials`
*   `team_members`
*   `teams`

**Chat & Messaging (No Custom Triggers):**
*   `attachments`
*   `chat_history`
*   `conversation_indexes`
*   `conversation_members`
*   `conversations`
*   `message_reactions`
*   `messages`
*   `poll_votes`

**Project Execution (No Custom Triggers):**
*   `document_chunks`
*   `documents`
*   `extension_requests`
*   `feedback`
*   `notes`
*   `project_documents`
*   `project_members`
*   `project_time_logs`
*   `projects`
*   `task_audit`
*   `task_evidence`
*   `task_feedback`
*   `task_notes`
*   `task_reviews`
*   `task_risk_snapshots`
*   `task_skills`
*   `task_stage_history`
*   `task_stages`
*   `task_state_history`
*   `task_steps`
*   `task_submission_skills`
*   `tickets`

**HR, Payroll & Leaves (No Custom Triggers):**
*   `attendance`
*   `employee_monthly_logs`
*   `leave_ai_analysis`
*   `leave_audit_logs`
*   `leaves`
*   `payroll`
*   `payslips`
*   `policies`
*   `time_logs`
*   `timesheets`

**Hiring & Invoicing Modules (No Custom Triggers):**
*   `candidates`
*   `clients`
*   `interviews`
*   `invoice_emails`
*   `invoice_items`
*   `invoice_templates`
*   `invoices`
*   `job_descriptions`
*   `jobs`
*   `offers`

**Announcements & Internal (No Custom Triggers):**
*   `announcements`
*   `notifications`
*   `semantic_cache`
