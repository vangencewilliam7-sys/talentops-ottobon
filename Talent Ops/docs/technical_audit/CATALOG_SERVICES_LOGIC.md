# ⚙️ Logic Master Catalog: Services, Utils, & Hooks

This catalog documents the "Non-UI" logic that drives TalentOps. These files are found in `services/`, `lib/`, `hooks/`, and `utils/`.

---

## 🛠️ Global Libraries (`/lib/`)
*   **`supabaseClient.ts`**  
    *   **The Connection**: The single entry point for DB communication. It uses the environment variables (`VITE_SUPABASE_URL`) to create the client.
*   **`businessHoursUtils.js`**  
    *   **The Math**: Contains `calculateDueDateTime`. It understands that if a 10-hour task starts at 4 PM on Friday, it isn't due at 2 AM on Saturday—it's due on Monday afternoon.
*   **`supabaseRequest.js`**  
    *   **The Error Handler**: A standardized wrapper for API calls that automatically shows "Toasts" (popups) if the network fails.

---

## 🧠 Role-Based Services (`/services/modules/`)
*   **`task/queries.js`**  
    *   **Logic**: Centralized task fetching. It handles the difficult logic of joining `tasks`, `projects`, and `profiles` correctly while enforcing `org_id` security.
*   **`task/mutations.js`**  
    *   **Logic**: Handles the heavy lifting of "Bulk Creation." It can take one task description and assign it to 20 people individually in a single transaction.
*   **`task/workflow.js`**  
    *   **Logic**: The "Step Manager." It keeps track of which specific step (e.g., "Review Requirements") an employee is currently on and locks the others.
*   **`risk/index.js`**  
    *   **Logic**: Predictive Analysis. It looks at tasks with "Yellow" status and compares them to the due date to see if they need management intervention.

---

## 🏗️ Utility Helper Engines (`/utils/`)
*   **`payrollCalculations.js`**  
    *   **Logic**: The Salary Core. It takes `base_salary`, adds `task_points * multiplier`, and subtracts any penalties to arrive at the final monthly pay.
*   **`pdfGenerator.js`**  
    *   **Logic**: Uses the **jsPDF** and **html2canvas** libraries. It "captures" the screen of a payslip and converts it into a digital PDF document.

---

## 🔔 Functional Hooks (`/hooks/`)
*   **`useBrowserNotification.js`**  
    *   **Description**: A custom hook that simplifies the browser's Notification API. It ensures that the app can send you a ping even if the window is minimized.

---

## 💬 Shared Communication
*   **`messageService.js`**  
    *   **Logic**: Real-time messaging engine. It manages the sorting of messages by timestamp and handles the "Read/Unread" status for every chat.
*   **`notificationService.js`**  
    *   **Logic**: The "Dispatcher." Every other service in the app calls this file when an action (Like "Task Finished") needs to alert a user.
