# Database Setup Scripts

This folder contains SQL scripts for setting up and managing the Supabase database.

## ⚡ Quick Setup

Run these scripts in order in **Supabase SQL Editor**:

### 1. Task Intelligence System (NEW)
```sql
-- Complete task blueprints, scoring, and audit system
task_intelligence_complete.sql
```

### 2. Messaging System
```sql
COMPLETE_MESSAGING_FIX.sql
```

### 3. Project Analytics
```sql
project_analytics_setup.sql
```

### 4. Other Features (as needed)
- `setup-leave-accumulation.sql` - Leave balance tracking
- `fix_payslips_storage_complete.sql` - Payslip storage  
- `update_announcements_schema.sql` - Announcements feature

## 📁 Script Descriptions

| Script | Purpose |
|--------|---------|
| `task_intelligence_complete.sql` | **Task Intelligence** - Blueprints, auto-scoring, trust passport, audit vault |
| `project_analytics_setup.sql` | Project analytics tables and functions |
| `COMPLETE_MESSAGING_FIX.sql` | **Main messaging setup** - Creates all messaging tables |
| `fix_messaging_rls.sql` | Fixes RLS policies if needed |
| `messaging_setup.sql` | Alternative messaging setup |
| `setup-leave-accumulation.sql` | Leave balance automation |
| `fix_payslips_storage_complete.sql` | Complete payslip setup |

## 🔐 Row Level Security

All tables have RLS enabled with permissive policies for development.
