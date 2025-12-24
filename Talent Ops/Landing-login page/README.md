# TalentOps - HR Management Platform

A modern, full-featured HR management platform built with React, TypeScript, and Supabase.

## 🚀 Features

- **Multi-Role Dashboards**: Executive, Manager, Team Lead, and Employee views
- **Real-time Messaging**: Direct messages, team chats, and organization-wide communication
- **Leave Management**: Request, approve, and track employee leave
- **Payroll & Timesheets**: Complete payroll processing with payslip generation
- **Announcements**: Company-wide and team-specific announcements
- **Task Management**: Assign and track tasks across teams

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling**: CSS with custom design system
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd talent-ops
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   Run the SQL scripts in `database/` folder in your Supabase SQL Editor:
   - Start with `COMPLETE_MESSAGING_FIX.sql` for messaging
   - See `database/README.md` for full instructions

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
├── components/
│   ├── employee/       # Employee dashboard components
│   ├── executive/      # Executive dashboard components
│   ├── manager/        # Manager dashboard components
│   ├── teamlead/       # Team lead dashboard components
│   ├── shared/         # Shared components (MessagingHub, etc.)
│   ├── newlanding/     # Landing page components
│   └── pages/          # Page-level components
├── database/           # SQL scripts for Supabase
├── services/           # API services (messageService, etc.)
├── lib/               # Supabase client configuration
├── utils/             # Utility functions
├── styles/            # Global styles
└── Dashboards/        # Dashboard configurations
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📝 License

MIT License
