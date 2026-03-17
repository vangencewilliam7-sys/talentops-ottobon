# 📔 TalentOps Master Catalog Index

Welcome to the complete technical record of the TalentOps codebase. This index serves as the entry point for understanding every individual file, its logic, and its architectural value.

> [!NOTE]
> This catalog is divided into specialized modules to make the review process easier to digest.

---

## 📂 Searchable Catalogs

### 1. [🏢 The Frontend Registry: Components & UI](file:///c:/Users/vardh/OneDrive/Desktop/t-ops/talentops-ottobon/Talent%20Ops/docs/technical_audit/CATALOG_FRONTEND_COMPONENTS.md)
*   **Context**: All 100+ React components from `components/employee`, `manager`, `shared`, and the Shadcn `ui/` library.
*   **Key Focus**: How we render dashboards, task tables, and real-time trackers.

### 2. [⚙️ The Logic Registry: Services & Utilities](file:///c:/Users/vardh/OneDrive/Desktop/t-ops/talentops-ottobon/Talent%20Ops/docs/technical_audit/CATALOG_SERVICES_LOGIC.md)
*   **Context**: `services/`, `lib/`, `hooks/`, and `utils/`.
*   **Key Focus**: Multi-tenancy bridges, business hour math, and PDF generation engines.

### 3. [🗄️ The Backend Registry: SQL & Database](file:///c:/Users/vardh/OneDrive/Desktop/t-ops/talentops-ottobon/Talent%20Ops/docs/technical_audit/CATALOG_DATABASE_RPCS.md)
*   **Context**: 49+ PL/pgSQL functions and triggers in `supabase/queries/`.
*   **Key Focus**: Server-authoritative session tracking, point calculations, and tenant isolation.

---

## 🏗️ Quick Reference: The Core Root Files
| File | Path | Role |
| :--- | :--- | :--- |
| **App.tsx** | `/App.tsx` | The Application Router; maps URLs to portals. |
| **main.jsx** | `/main.jsx` | The entry bridge that boots React into the browser. |
| **index.css** | `/index.css` | Global Tailwind directives and custom animation keyframes. |
| **types.ts** | `/types.ts` | Global TypeScript interfaces for Tasks, Profiles, and Teams. |
| **vite.config.ts** | `/vite.config.ts` | Optimizes the code for 2x faster loading in production. |

---

## 📜 How to use this Catalog
During your code review, if a stakeholder asks about a specific file:
1.  **Locate the Category** (Frontend, Logic, or Database).
2.  **Ctrl+F** the filename in the linked document.
3.  **Read the "Internal Logic" snippet** provided to explain exactly *how* that file works.
