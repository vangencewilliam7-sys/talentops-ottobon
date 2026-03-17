# 📂 TalentOps: Folder Structure & Architecture Deep-Dive

The TalentOps codebase follows a **Role-Based Fractal Architecture**. This means that instead of having one giant folder for all pages, the application is divided into "Portals" (Employee, Manager, Executive) that each contain their own logic, but share a common core.

---

## 🏗️ 1. The `components/` Directory (The UI Core)
This is where 90% of the frontend logic lives. It is divided by **User Role**.

### 👤 `components/employee/`
This is the most critical folder for the end-user experience. It is divided into sub-folders for better organization:

#### 📊 `components/employee/components/Dashboard/`
These are the small "widgets" that make up the main home screen.
*   **`AttendanceTracker.jsx`**: The most important widget. It talks to the `check_in` and `check_out` RPCs in Supabase. It keeps track of the "Live Clock" and current task.
*   **`StatCard.jsx`**: A reusable "Box" used to show big numbers, like "Tasks Done" or "Hours Today." It makes the dashboard look professional and data-driven.
*   **`ListWidget.jsx`**: A flexible component used to show a quick list of recent items (like recent tasks or messages) on the home screen.

#### 🧪 `components/employee/components/Demo/`
These are complex, feature-rich views that demonstrate the power of the platform.
*   **`StatusDemo.jsx`**: This is where the **Deep Attendance Logic** lives. It calculates your weekly average hours and contains the "Self-Healing" logic that auto-closes sessions you forgot to check out of.
*   **`AnalyticsDemo.jsx`**: Uses **Recharts** to draw beautiful bar graphs and line charts of your performance over time.
*   **`KanbanDemo.jsx`**: A "Drag and Drop" style board for managing tasks visually (To-Do, In-Progress, Done).
*   **`HierarchyDemo.jsx`**: A visual tree showing your team members and who reports to whom—essential for large organizations.
*   **`AuditLogsDemo.jsx`**: A security feature that shows a history of everything that happened to your account.

#### 🏗️ `components/employee/components/Layout/`
*   **`Sidebar.jsx`**: The left-hand navigation menu. It changes dynamically based on your role (Consultant vs. Manager).
*   **`Navbar.jsx`**: The top bar containing the **Project Picker** and your profile settings.

#### 👤 `components/employee/` (Root Files)
*   **`App.jsx`**: The "Traffic Controller" for the employee portal. It defines all the routes (e.g., `/dashboard`, `/my-tasks`).
*   **`pages/`**: Contains high-level view components like `MyTasksPage.jsx` and `ModulePage.jsx`.
*   **`context/`**: Contains `ProjectContext.jsx` and `UserContext.jsx`. These are the "Global Brains" that keep track of your `org_id` and which project you are currently viewing.

### 🏢 `components/manager/`, `components/teamlead/`, `components/executive/`
These folders contain the **Administrative Portals**. 
*   They isolated because a Manager needs a completely different set of tools (like Payroll management and Team Analytics) compared to a regular Employee.

### 🤝 `components/shared/` (The "Single Source of Truth")
To prevent code duplication, complex logic is moved here.
*   **`AllTasksView.jsx`**: Both Employees and Managers use this, but with different "permission flags" passed as props.
*   **`TaskLifecyclePage.jsx`**: Handles the logic for the 5-step task validation.
*   **`ActiveStatusDot.jsx`**: The real-time green dot that shows if you are currently working.

### 🎨 `components/ui/`
This folder contains "Primitive" components. These are small, reusable building blocks that don't have business logic:
*   Standardized **Buttons**, **Modals**, and **DataTables**.
*   This ensures that a button in the Manager portal looks exactly the same as a button in the Employee portal.

---

## 🛠️ 2. The `services/` Directory (The API Bridge)
Located at the root, this folder keeps the React components clean.
*   **`services/modules/task/`**: Instead of writing `supabase.from('tasks')...` inside a UI file, we call `taskService.getTasks()`.
*   **Reason**: If the database schema changes, we only have to fix it in **one** file (`queries.js`) instead of 50 different pages.

---

## 🛡️ 3. The `supabase/` Directory (The Database Guard)
This folder contains the "Brains" of the backend.
*   **`queries/`**: Contains all the PL/pgSQL functions.
*   **Hardening**: Functions like `check_in()` live here so that logic (like multi-tenancy) is handled by the server, not the browser.

---

## 📅 Summary for Review
If you are asked "Why is it structured this way?" in your review, the answer is:
1.  **Isolation**: Roles are separated so that code changes in the Employee portal don't accidentally break the Manager's Payroll system.
2.  **Scalability**: Adding a new role (e.g., HR) is as simple as creating a new `components/hr/` folder.
3.  **Security**: Global states (Contexts) and Database Functions (RPCs) ensure `org_id` is always enforced.
