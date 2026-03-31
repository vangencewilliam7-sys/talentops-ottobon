# Project Plan: Paid/Unpaid Intern Support & Dashboard Visibility Fix

## Objective
Implement comprehensive support for "Unpaid Interns" in the TalentOps HRMS. This includes tracking their pay status, storing stipend information, excluding them from automated payroll generation, and fixing dashboard visibility issues.

---

## 1. Database Schema Enhancements
We have introduced two new fields to differentiate intern payment structures from regular employees:
- **`public.profiles.is_paid`**: A boolean flag (`DEFAULT TRUE`) to track if an intern is receiving compensation.
- **`public.employee_finance.stipend`**: A numeric field to store the monthly stipend amount, keeping it separate from the `basic_salary` structure used for full-time employees.

---

## 2. Backend & Logic Updates

### A. Automated Payroll Exclusion
Modified the `generate_monthly_payroll` RPC to explicitly skip any profile where `employment_type = 'intern'`. This ensures interns are never included in the firm's bulk automated payroll runs, as their payments are handled manually via external XLSX ledgers.

### B. Employee Creation (Edge Function)
Update the `add-employee` Edge Function to:
- Accept `is_paid` and `stipend` from the frontend payload.
- Persist `is_paid` to the `profiles` table.
- Persist `stipend` to the `employee_finance` table.
- *Note: This was partially reverted in a recent git pull and needs re-patching.*

---

## 3. Frontend Implementation

### A. Add Employee Workflow (`AddEmployeeModal.jsx`)
Re-implement the following UI/UX features (lost during `git pull`):
- **Conditional Fields**: Show a "Paid/Unpaid" toggle only when "Intern" is selected as the employment type.
- **Stipend Input**: Provide a clear "Stipend (₹)" input when "Paid Intern" is selected.
- **Payload update**: Ensure these fields are sent to the Edge Function.

### B. Employee Hub Visibility (`ModulePage.jsx`)
Fix the critical bug where marking an intern as "Unpaid" made them disappear from the grid:
- **Fetch Logic**: Update the Supabase query to include `is_paid` and `employment_type`.
- **Search Hardening**: Fix the client-side filter logic to safely handle `null` or `undefined` values for `job_title` and `department_display` (e.g., using `?.toLowerCase()` or fallback strings).

### C. Edit Employee Support (`EditEmployeeModal.tsx`)
Update the modification workflow to allow managers to toggle an intern's paid status and update their stipend amount post-onboarding.

---

## 4. Verification Plan

### Automated Steps
1. **Verification of Workforce Count**: Ensure the "Total Workforce" stat matches the number of visible cards in the Hub.
2. **Persistence Test**: Create a "Paid Intern" and an "Unpaid Intern" and verify their records in the `profiles` and `employee_finance` tables via the dashboard.
3. **Payroll Dry-Run**: Trigger a automated payroll generation and verify that interns are successfully skipped.

### Manual Verification
- Confirm with the user that the interns are now visible in the Employees Hub regardless of their payment status.
