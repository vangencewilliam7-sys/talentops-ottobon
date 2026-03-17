# 📖 The Ultimate TalentOps Master Catalog: Every Single File Explained

This is the definitive technical encyclopedia for the TalentOps platform. It breaks down every major file in the repository, explaining its **functionality**, its **purpose**, and the **critical logic** it contains. Use this to prepare for a deep-dive technical review.

---

## 🏛️ 1. ARCHITECTURAL ROOT (The Hub)
These files bootstrap the application and define the environment.

*   **`index.html`**  
    *   **Description**: The entry point for the browser.  
    *   **Why it's there**: It provides the root DOM node (`<div id="root"></div>`) where the React app is mounted and sets initial meta-tags and fonts.
*   **`App.tsx`**  
    *   **Description**: The "Router Root."  
    *   **Logic**: It wraps the entire application in Context Providers (`UserProvider`, `ProjectProvider`, `ToastProvider`) and maps URL paths to the correct "Portal" components (Employee vs. Manager).
*   **`main.jsx` / `index.tsx`**  
    *   **Description**: The React-DOM Bridge.  
    *   **Logic**: This is where the code meets the browser. It imports the styles (`index.css`) and renders the `<App />` component.
*   **`tailwind.config.js`**  
    *   **Description**: The "Design System" Blueprint.  
    *   **Purpose**: Defines the organization’s color palette, custom shadows (glassmorphism), and responsive breakpoints (Mobile vs. Desktop).
*   **`vite.config.ts`**  
    *   **Description**: The Build Engine.  
    *   **Why it's there**: Configures the compiler to optimize images, minify JavaScript, and enable fast-refresh during development.

---

## 🔐 2. CONTEXT & STATE (The Memory)
Located in `components/employee/context/`, these files manage global data.

*   **`UserContext.jsx`**  
    *   **Logic**: This is the "Security Guard." It maintains the `userId` and `orgId`. Every query in the system looks here to ensure it is asking for data belonging to the correct company.
*   **`ProjectContext.jsx`**  
    *   **Logic**: This is the "Project Nerve Center." It manages which project is currently selected and—crucially—determines your `project_role` inside that specific project.

---

## ⚙️ 3. CORE SERVICES (The Backend Bridge)
Located in `services/`, these files handle the heavy lifting.

*   **`messageService.js`**  
    *   **Function**: Real-Time Chat.  
    *   **Logic**: Uses Supabase Realtime to listen for new rows in the `messages` table. It handles rich-text messages and group chats.
*   **`notificationService.js`**  
    *   **Function**: The Alert Engine.  
    *   **Logic**: Centralizes the logic for creating notifications across the app. It ensures that when a manager acts, the employee gets a ping.
*   **`storageService.js`**  
    *   **Function**: Asset Management.  
    *   **Logic**: Manages uploads to Cloud Storage buckets. It prevents unauthenticated users from seeing internal project documents by using signed links.

---

## 🛠️ 4. THE TASK ENGINE (`services/modules/task/`)
This is the most specialized part of the codebase.

*   **`queries.js`**  
    *   **Logic**: The "Hardened Reader." It includes the security filters that enforce "If you are an employee, you only see tasks assigned to you."
*   **`mutations.js`**  
    *   **Logic**: The "Database Writer." Handles creating single or bulk tasks (multi-assign) and ensures all math (hours/priorities) is valid before saving.
*   **`workflow.js`**  
    *   **Logic**: The "Status Controller." Manages the transition of tasks from Requirement → Design → Build → Acceptance → Deploy. It logic-checks if a task is *actually* ready to move to the next stage.

---

## 📈 5. DASHBOARD & ANALYTICS (`components/employee/components/`)
Focuses on converting data into visual intelligence.

*   **`AttendanceTracker.jsx`**  
    *   **Function**: Real-Time Timecard.  
    *   **Logic**: Manages the check-in timer. It is "State-Aware"—it knows if you are on break or on a specific task and updates the "Green Dot" accordingly.
*   **`AnalyticsDemo.jsx`**  
    *   **Function**: Performance Visualization.  
    *   **Logic**: Processes raw task data into charts (Bar, Area, Pie) using the `recharts` library for management review.
*   **`StatusDemo.jsx`**  
    *   **Function**: Attendance Intelligence.  
    *   **Logic**: Analyzes your work history to find "Ghost Sessions" (sessions you forgot to close) and allows you to fix them.

---

## 👥 6. SHARED PAGE MODULES (`components/shared/`)
These are the building blocks used by every role in the company.

*   **`AllTasksView.jsx`**  
    *   **Description**: The Master Task List.  
    *   **Logic**: A high-performance table that handles filtering thousands of tasks by priority, status, or assignee.
*   **`TaskLifecyclePage.jsx`**  
    *   **Description**: The Detail View.  
    *   **Logic**: Shows the "Proof of Work" for a task. This is where managers approve or reject specific steps of a task.
*   **`PayslipsPage.jsx`**  
    *   **Description**: Financial History.  
    *   **Logic**: Fetches processed payroll data and allows users to generate professional PDF records of their income.

---

## 🗄️ 7. THE DATABASE BRAIN (`supabase/queries/`)
These are the SQL functions that run directly on the database server.

*   **`rpc_clock_in.sql`**  
    *   **Description**: Secure Check-in.  
    *   **Rationale**: By running this as an RPC, we prevent users from "faking" their check-in time by modifying the frontend clock. The time is taken from the server.
*   **`rpc_get_my_profile_v3.sql`**  
    *   **Description**: Single-Call Profile Fetch.  
    *   **Logic**: Joins profiles, departments, projects, and finance data into one JSON object. This reduces network load significantly.
*   **`calculate_task_points.sql`** (Trigger)  
    *   **Description**: Automated Bonus Logic.  
    *   **Rationale**: Automatically calculates performance points based on how much faster a task was finished vs. its deadline.

---

## 🧪 8. HELPERS & UTILS (`/lib` & `/utils`)
The "Secret Sauce" math and configurations.

*   **`businessHoursUtils.js`**  
    *   **Complexity**: High.  
    *   **Logic**: Contains the algorithms for "Dynamic Slacking." If a task is due in 8 hours and it's Friday afternoon, it knows the true deadline is actually Monday morning.
*   **`payrollCalculations.js`**  
    *   **Complexity**: High.  
    *   **Logic**: Handles the "Point-to-Currency" conversion, taking into account base salary, bonuses, and penalties for late delivery.

---

**Architectural Statement**: "TalentOps is designed to be **Server-Authoritative**. We move logic out of the browser and into specialized Service and Database layers to ensure multi-tenancy is impossible to bypass and data is 100% accurate."
