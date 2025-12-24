# Database Setup Scripts

This folder contains SQL scripts for setting up and managing the Supabase database.

## ⚡ Quick Setup

Run these scripts in order in **Supabase SQL Editor**:

### 1. Messaging System
```sql
-- Run this first to set up messaging
COMPLETE_MESSAGING_FIX.sql
```

### 2. Other Features (as needed)
- `setup-leave-accumulation.sql` - Leave balance tracking
- `fix_payslips_storage_complete.sql` - Payslip storage  
- `update_announcements_schema.sql` - Announcements feature

## 📁 Script Descriptions

| Script | Purpose |
|--------|---------|
| `COMPLETE_MESSAGING_FIX.sql` | **Main messaging setup** - Creates all messaging tables with correct schema |
| `fix_messaging_rls.sql` | Fixes RLS policies if needed |
| `fix_org_id_null.sql` | Optional org_id fix |
| `messaging_setup.sql` | Alternative messaging setup |
| `migrate_messaging_schema.sql` | Full schema with migrations |
| `setup_messaging_database.sql` | Original messaging setup |
| `setup-leave-accumulation.sql` | Leave balance automation |
| `fix_payslip_storage_policy.sql` | Payslip storage fixes |
| `fix_payslips_storage_complete.sql` | Complete payslip setup |
| `update_announcements_schema.sql` | Announcements table |

## 🔐 Row Level Security

All tables have RLS enabled. The scripts set up permissive policies for development.
For production, consider adding organization-based restrictions.
