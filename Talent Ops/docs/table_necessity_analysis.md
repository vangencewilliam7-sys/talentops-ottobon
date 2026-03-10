# Database Table Necessity Analysis

You currently have **69 tables** in your Supabase database. Are all of them strictly necessary? 

The short answer is **no, probably not all of them.** Over time, projects accumulate test tables, deprecated architectures, or redundant records. 

Below is the structured breakdown isolating the **Core Essential Tables** vs the **Unnecessary/Redundant/Optional Tables**.

---

## 🚫 UNNECESSARY, REDUNDANT, OR OPTIONAL TABLES
*(Roughly ~30-35 tables. You do not strictly need these for the core application to function, and they can likely be safely removed, consolidated into SQL Views, or archived if their specific module is inactive).*

### 1. Highly Redundant Audit & Tracking Logic
*You have multiple tables tracking the exact same logical things (Time and Task state). These can be consolidated or replaced with simple SQL Views.*
*   `employee_monthly_logs` *(Redundant if generating from `time_logs`)*
*   `project_time_logs` *(Redundant if generating from `time_logs` or `timesheets`)*
*   `timesheets` *(Can often just be a `status` column on `time_logs`)*
*   `task_audit` *(Redundant copy of `task_state_history`)*
*   `task_stage_history` *(Redundant copy of `task_state_history`)*
*   `leave_audit_logs` *(Often unnecessary unless strict enterprise compliance is needed)*
*   `organization_memberships` *(Usually duplicate logic if `profiles.org_id` exists)*

### 2. Disconnected/Optional Modules (Invoicing & Outbound Hiring)
*If your application is an internal Talent/Task management platform, you likely do not need built-in B2B invoicing and candidate tracking.*
*   `candidates`
*   `interviews`
*   `job_descriptions`
*   `jobs`
*   `offers`
*   `clients`
*   `company_details`
*   `invoice_emails`
*   `invoice_items`
*   `invoice_templates`
*   `invoices`

### 3. Isolated Feedback & Reporting
*These might be "nice to haves" but are entirely optional for the database engine to run.*
*   `task_feedback`
*   `task_notes`
*   `employee_reviews`
*   `task_reviews`
*   `feedback`
*   `notes`
*   `tickets`

### 4. Advanced AI & Analytics (Optional)
*These power RAG and AI features, but aren't strictly core to the standard CRUD operations.*
*   `document_chunks`
*   `documents`
*   `semantic_cache`
*   `leave_ai_analysis`
*   `task_risk_snapshots`

---

## 🟢 CORE ESSENTIAL TABLES
*(Roughly ~30 tables. These form the critical engine of your SaaS platform. Do NOT delete these if the features are active).*

**Organization & Login Foundation:**
- `orgs` 
- `profiles` 
- `departments`
- `teams` 
- `team_members`

**Project & Task Execution:**
- `projects`
- `project_members`
- `tasks`
- `task_steps`
- `task_submissions`
- `task_state_history`
- `task_evidence`

**HR, Payroll & Leaves:**
- `attendance` 
- `time_logs`
- `leaves` 
- `employee_finance` 
- `payroll` 
- `payslips`

**Messaging & Chat:**
- `conversations`
- `conversation_members`
- `messages`
- `attachments`
- `message_reactions`
- `conversation_indexes`
- `poll_options` (If active)
- `poll_votes`

**Skills Engine:**
- `skills_master`
- `employee_skills`
- `task_skills`
- `task_submission_skills`
- `employee_performance_snapshots`

**General System:**
- `announcements`
- `project_documents` 
- `notifications`
