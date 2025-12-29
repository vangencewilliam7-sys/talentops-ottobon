-- =====================================================
-- PROJECT ANALYTICS DATABASE SETUP
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. EXTEND TEAMS TABLE WITH FINANCIAL/TIMELINE FIELDS
-- =====================================================
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS estimated_end_date DATE,
ADD COLUMN IF NOT EXISTS total_budget DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add check constraint for status (may need to drop and recreate if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teams_status_check'
    ) THEN
        ALTER TABLE teams ADD CONSTRAINT teams_status_check 
        CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled'));
    END IF;
END $$;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_teams_dates ON teams(start_date, end_date);


-- 2. TEAM MEMBERS TABLE (Project Assignments)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Role in project
    role_in_project VARCHAR(100) NOT NULL DEFAULT 'other',
    
    -- Assignment timeline
    assignment_start DATE NOT NULL DEFAULT CURRENT_DATE,
    assignment_end DATE,  -- NULL = ongoing
    
    -- Rate for cost calculation
    hourly_rate DECIMAL(10, 2),
    monthly_rate DECIMAL(12, 2),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_id, profile_id, assignment_start)
);

-- Add check constraint for role_in_project
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'team_members_role_check'
    ) THEN
        ALTER TABLE team_members ADD CONSTRAINT team_members_role_check 
        CHECK (role_in_project IN ('frontend', 'backend', 'fullstack', 'devops', 
               'infra', 'qa', 'design', 'bd', 'pm', 'team_lead', 'other'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile ON team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_team_members_dates ON team_members(assignment_start, assignment_end);


-- 3. TEAM FINANCIALS TABLE (Monthly/Phase Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Period type
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_label VARCHAR(100),  -- e.g., "Jan 2025" or "Phase 1"
    
    -- Financial data
    revenue DECIMAL(15, 2) DEFAULT 0,
    salary_cost DECIMAL(15, 2) DEFAULT 0,
    other_costs DECIMAL(15, 2) DEFAULT 0,
    net_profit DECIMAL(15, 2) GENERATED ALWAYS AS (revenue - salary_cost - other_costs) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_id, period_start, period_end)
);

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'team_financials_period_check'
    ) THEN
        ALTER TABLE team_financials ADD CONSTRAINT team_financials_period_check 
        CHECK (period_type IN ('monthly', 'milestone', 'phase'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_financials_team ON team_financials(team_id);
CREATE INDEX IF NOT EXISTS idx_team_financials_period ON team_financials(period_start, period_end);


-- 4. EXTEND PROFILES FOR NOTICE PERIOD TRACKING
-- =====================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS notice_period_end DATE,
ADD COLUMN IF NOT EXISTS last_working_day DATE;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_employment_status_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_employment_status_check 
        CHECK (employment_status IN ('active', 'notice_period', 'resigned', 'terminated'));
    END IF;
END $$;


-- 5. ROW LEVEL SECURITY POLICIES
-- Executive: Full CRUD | Manager: View-only
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_financials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runs)
DROP POLICY IF EXISTS "Exec/Manager can view team_members" ON team_members;
DROP POLICY IF EXISTS "Executives can manage team_members" ON team_members;
DROP POLICY IF EXISTS "Exec/Manager can view team_financials" ON team_financials;
DROP POLICY IF EXISTS "Executives can manage team_financials" ON team_financials;

-- team_members: SELECT for Exec/Manager
CREATE POLICY "Exec/Manager can view team_members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('executive', 'Executive', 'manager', 'Manager')
        )
    );

-- team_members: ALL for Executive only
CREATE POLICY "Executives can manage team_members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('executive', 'Executive')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('executive', 'Executive')
        )
    );

-- team_financials: SELECT for Exec/Manager
CREATE POLICY "Exec/Manager can view team_financials" ON team_financials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('executive', 'Executive', 'manager', 'Manager')
        )
    );

-- team_financials: ALL for Executive only
CREATE POLICY "Executives can manage team_financials" ON team_financials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('executive', 'Executive')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('executive', 'Executive')
        )
    );


-- 6. ANALYTICS VIEWS
-- =====================================================

-- Drop existing views for re-runs
DROP VIEW IF EXISTS v_team_analytics;
DROP VIEW IF EXISTS v_resource_gaps;

-- Project/Team summary with member count and financials
CREATE OR REPLACE VIEW v_team_analytics AS
SELECT 
    t.id,
    t.team_name AS name,
    t.description,
    t.status,
    t.start_date,
    t.end_date,
    t.total_budget,
    t.total_revenue,
    t.total_cost,
    (t.total_revenue - t.total_cost) AS net_profit,
    t.manager_id,
    pm.full_name AS manager_name,
    COUNT(DISTINCT tm.profile_id) AS member_count,
    EXTRACT(MONTH FROM AGE(COALESCE(t.end_date, CURRENT_DATE), COALESCE(t.start_date, CURRENT_DATE))) + 1 AS duration_months
FROM teams t
LEFT JOIN profiles pm ON t.manager_id = pm.id
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY t.id, t.team_name, t.description, t.status, t.start_date, t.end_date, 
         t.total_budget, t.total_revenue, t.total_cost, t.manager_id, pm.full_name;


-- Resource gaps view (members on notice period with gap detection)
CREATE OR REPLACE VIEW v_resource_gaps AS
SELECT 
    tm.team_id,
    t.team_name,
    tm.profile_id,
    pr.full_name,
    tm.role_in_project,
    tm.assignment_start,
    tm.assignment_end,
    pr.employment_status,
    pr.last_working_day,
    pr.notice_period_end,
    -- Calculate gap in days: time between last_working_day and assignment_end or project_end
    -- In PostgreSQL, DATE - DATE returns integer (days) directly
    CASE 
        WHEN pr.employment_status = 'notice_period' 
        AND pr.last_working_day < COALESCE(tm.assignment_end, t.end_date)
        THEN (COALESCE(tm.assignment_end, t.end_date) - pr.last_working_day)
        ELSE 0
    END AS gap_days,
    -- Has resource gap flag
    CASE 
        WHEN pr.employment_status = 'notice_period' 
        AND pr.last_working_day < COALESCE(tm.assignment_end, t.end_date)
        THEN TRUE
        ELSE FALSE
    END AS has_gap
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN profiles pr ON tm.profile_id = pr.id
WHERE pr.employment_status = 'notice_period';


-- 7. AUTO-MIGRATE EXISTING DATA
-- Set default values for existing teams
-- =====================================================
UPDATE teams 
SET 
    status = COALESCE(status, 'active'),
    start_date = COALESCE(start_date, CURRENT_DATE),
    updated_at = NOW()
WHERE status IS NULL OR start_date IS NULL;


-- =====================================================
-- SETUP COMPLETE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Project Analytics database setup complete!';
    RAISE NOTICE '   - teams table extended with financial fields';
    RAISE NOTICE '   - team_members table created';
    RAISE NOTICE '   - team_financials table created';
    RAISE NOTICE '   - profiles extended with employment_status';
    RAISE NOTICE '   - RLS policies configured (Exec=CRUD, Manager=Read)';
    RAISE NOTICE '   - Analytics views created';
END $$;
