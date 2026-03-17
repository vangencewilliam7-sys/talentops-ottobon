# ⚙️ TalentOps: Services & Business Logic Deep-Dive

The `services/` directory is the **"Nervous System"** of the application. It acts as the bridge between the React UI (the body) and Supabase (the brain). By keeping logic here, we ensure that the UI stays "lean" and the business rules are consistent across the entire app.

---

## 📂 1. Core Services (Communication & Storage)

### 💬 `services/messageService.js`
*   **Purpose**: Manages all real-time chat functionality.
*   **Detail**: It handles sending messages, fetching chat history, and subscribing to PostgreSQL real-time channels so users see new messages instantly without refreshing.
*   **Review Note**: It supports both individual and group chats, which is critical for project collaboration.

### 🔔 `services/notificationService.js`
*   **Purpose**: The central engine for user alerts.
*   **Detail**: Whenever a task is assigned, a leave is approved, or an announcement is made, this service inserts a record into the `notifications` table. 
*   **Impact**: It drives the "Red Badge" notifications you see in the sidebar.

### 📁 `services/storageService.js`
*   **Purpose**: Manages file assets.
*   **Detail**: Handles uploading task proofs, profile avatars, and organization policies to Supabase Storage Buckets. It generates "Signed URLs" so files can be viewed securely.

---

## 🛠️ 2. The `modules/task/` Engine
This is the most complex part of the system. We have divided it into sections based on functionality:

### 🔍 `task/queries.js` (The "Eye")
*   **Role**: Handles all read-only data fetching.
*   **Hardening**: This is where we implemented the strict `org_id` and `userRole` checks to prevent data leaks. It ensures you only see the tasks you are authorized to see.

### ✍️ `task/mutations.js` (The "Hand")
*   **Role**: Handles data changes (Create, Update, Delete).
*   **Detail**: When a manager creates a task or an employee updates progress, this file manages the database insertion and ensures all fields (like `allocated_hours`) are correctly formatted.

### 🔄 `task/workflow.js` (The "Brain")
*   **Role**: Manages the 5-step Task Lifecycle.
*   **Detail**: Contains the logic for **Phase Approvals**, **Rejections**, and **State Reversion**. It manages the `phase_validations` JSON object which tracks the "Green/Yellow/Blue" status indicators you see on the dashboard.

### 🧩 `task/AddTaskModal.jsx`, `TaskFilters.jsx`, `TaskTable.jsx`
*   **Role**: Modular Task UI.
*   **Detail**: We moved these large UI parts out of the main page and into the service folder. This makes the code much cleaner and allows us to reuse the Task Table in different portals (Employee vs. Manager).

---

## 🤖 3. The `modules/risk/` AI Layer

### 🧠 `risk/index.js`
*   **Purpose**: AI-powered performance coaching.
*   **Detail**: This service analyzes task deadlines vs. current progress. It triggers the **"AI Risk Coach"** popup if it detects a user might miss a deadline or is over-allocated.
*   **Benefit**: This adds a "Proactive" layer to the app, helping employees manage their time before a crisis occurs.

---

## 🎯 Architecture Summary for Review
If asked "Why use a services folder?", the answer is:
1.  **Separation of Concerns**: UI components handle *Display*; Services handle *Logic*.
2.  **Centralized Security**: Multi-tenant guards (`org_id`) are applied in one place (Services), making it impossible to bypass them in the UI.
3.  **Maintainability**: If we ever change our database (e.g., move from Supabase to another provider), we only need to update the `services/` folder; the UI remains untouched.
