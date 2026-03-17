# 🏢 Frontend Master Catalog: Portals & UI Library

This catalog documents the 100+ visual components of TalentOps. These are found in `/components/`.

---

## 👤 Employee Portal (`/employee/`)
*   **`ModulePage.jsx`**  
    *   **Description**: The "Master Container." This single file dynamically loads every other tool based on the sidebar selection.
*   **`AttendanceTracker.jsx`** (in `components/Dashboard/`)  
    *   **Logic**: The clock interface. It manages the "Live Timer" state and converts the current time into the session logs.
*   **`StatusDemo.jsx`** (in `components/Demo/`)  
    *   **Logic**: The "Attendance Intelligence" dashboard. It shows historical summaries and weekly trends.

---

## 👥 Shared Architecture (`/shared/`)
These are the files used by EVERYONE to ensure a consistent experience.

*   **`AllTasksView.jsx`**  
    *   **Description**: The "Grid View." A powerful, sortable table for viewing tasks. It supports complex multi-status filtering.
*   **`TaskLifecyclePage.jsx`**  
    *   **Description**: The "Working View." This is where the actual work happens—uploading proofs, viewing guidance, and chat.
*   **`MessagingHub.jsx`**  
    *   **Description**: The full-screen chat interface. It acts as the "Slack-like" core of the platform.
*   **`PayslipsPage.jsx`**  
    *   **Description**: The employee's window into their finances. It links to the `pdfGenerator` for downloads.

---

## 🛡️ Contexts (State Management)
Located in `components/employee/context/` and `components/shared/context/`.

*   **`UserContext.jsx`**: Manages the core login session.
*   **`ProjectContext.jsx`**: Manages the project switching logic (Changing your view from Project A to Project B).

---

## 🎨 UI Building Blocks (`/ui/`)
We use **Shadcn/UI**, a state-of-the-art component library. Every file in this folder is a "Primitive."

*   **`button.tsx`**: Standardized buttons with different variants (Primary, Outline, Ghost).
*   **`card.tsx`**: The "Glassmorphism" boxes used for every widget.
*   **`table.tsx`**: The foundational grid used to build Task and Payroll lists.
*   **`dialog.tsx`**: The "Modals" (popups) used for creating tasks and editing profiles.
*   **`chart.tsx`**: The wrapper around **Recharts** for performance graphs.

---

## 🔑 Access Control
*   **`RoleGuard.tsx`**: A secondary security layer. If a user tries to manually visit `/admin` but their role is `employee`, this file will detect it and redirect them to the home page before the page even loads.
