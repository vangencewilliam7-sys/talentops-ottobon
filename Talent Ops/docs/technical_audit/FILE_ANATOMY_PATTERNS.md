# 🧬 The Anatomy of a TalentOps File: Internal Code Patterns

To succeed in your technical review, you need to explain not just *what* the files do, but **how they are written**. TalentOps follows a strict "Anatomical Standard." Every file of a certain type follows the same internal structure.

---

## ⚛️ 1. Anatomy of a UI Component (React `.jsx`)
*Example: `AttendanceTracker.jsx`, `StatCard.jsx`*

Every component is built in 5 distinct layers:

1.  **The Import Layer**: (Top 10 lines)  
    *   Imports React hooks (`useState`, `useEffect`).
    *   Imports Lucide-react icons for the premium UI.
    *   Imports the `supabase` client for data.
2.  **The Context Hook Layer**:  
    *   Uses `useUser()` or `useProject()` to get the `orgId`.  
    *   **Crucial Rule**: Components never "guess" the organization; they always pull it from the global context.
3.  **The State Management Layer**:  
    *   Uses `useState` to track local things like `isClockedIn` or `timerValue`.
4.  **The Logic/Service Call Layer**:  
    *   Functions like `handleCheckIn()`.  
    *   **Design Pattern**: Instead of complex math here, the component simply calls the **Service Layer** or a **Supabase RPC**.
5.  **The JSX Return (The View)**:  
    *   The "Template" of the component. It uses Tailwind CSS for all styling (e.g., `flex`, `items-center`, `bg-white/10` for glassmorphism).

---

## 🔗 2. Anatomy of a Service Module (`.js`)
*Example: `services/modules/task/queries.js`*

Services are "Pure Logic" files (no UI). They follow this structure:

1.  **The Supabase Client Import**: Always at the top.
2.  **The Exported Function**: e.g., `export const getTasks = async (...)`.
3.  **The Parameter Block**: Takes the minimum required (IDs, roles).
4.  **The Query Builder**:  
    *   This is the most important part. It uses the Supabase `.from()`, `.select()`, and `.eq()` methods.
    *   **The Guard**: Every service function includes a `.eq('org_id', orgId)` line. This is our "Hardened Multi-Tenancy."
5.  **Data Enrichment**: After the database returns data, the service "enriches" it (e.g., mapping user names or calculating points) before sending it to the UI.

---

## 🧠 3. Anatomy of a Global Context (`.jsx`)
*Example: `UserContext.jsx`, `ProjectContext.jsx`*

These are the "Global Brains" of the app.

1.  **The Creation**: `const UserContext = createContext();`
2.  **The Provider Component**: `export const UserProvider = ({ children }) => { ... }`.
3.  **The Storage**: This is where we store the logged-in user's profile, organization info, and roles.
4.  **The Sync Logic**: Uses `supabase.auth.onAuthStateChange` to automatically update the app if the user logs out or switches accounts.
5.  **The Value Object**: At the very bottom, it returns a `<UserContext.Provider value={{ user, orgId, role }}>`. This "broadcasts" the values to every file in the app.

---

## 🗄️ 4. Anatomy of a Database RPC (`.sql`)
*Example: `rpc_clock_in.sql`*

These run on the server, written in PL/pgSQL.

1.  **Function Signature**: `CREATE OR REPLACE FUNCTION name() RETURNS json ... SECURITY DEFINER`.
2.  **The Variable Declaration (`DECLARE`)**: Defines the internal variables (IDs, Timestamps).
3.  **The Auth Check**: Uses `auth.uid()` to verify who is calling the function.
4.  **The Logic Block (`BEGIN...END`)**:  
    *   Atomic operations. It doesn't just "Insert"—it checks if a record exists first, prevents duplicates, and calculates hours.
5.  **The JSON Return**: Every function returns a standardized JSON object like `{ "success": true, "message": "..." }`. This allows the React UI to easily understand what happened.

---

## 📏 5. Anatomy of a Utility File (`.js`)
*Example: `businessHoursUtils.js`*

These are simple "Worker" files.

1.  **Pure Functions**: They do not talk to the database. They only take inputs and return outputs (e.g., Input: 8 hours; Output: Monday at 10 AM).
2.  **Exported Constants**: Often stores configuration like `WORK_START_TIME = '09:00'`.

---

### 🛡️ Why use these "Standard Anatomies"?
When you explain this in your review, say:  
*"We use a **Standardized Anatomical Framework** across our codebase. By ensuring that every Page, Service, and SQL function follows the same internal pattern, we have zero technical debt, high readability for new developers, and 100% predictable security."*
