-- =====================================================
-- SKILL CAPTURE SYSTEM: DATABASE SCHEMA
-- =====================================================
-- This creates the two required tables for post-task skill tracking
-- Run this in your Supabase SQL Editor

-- ----------------------------------------------------
-- TABLE 1: skills_master (Skill taxonomy/lookup)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skills_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_key TEXT UNIQUE NOT NULL,          -- e.g., 'frontend'
    skill_name TEXT NOT NULL,                -- e.g., 'Frontend'
    category TEXT NOT NULL,                  -- 'engineering' or 'ai_ml'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skills_master ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read skills
DROP POLICY IF EXISTS "authenticated_read_skills" ON public.skills_master;
CREATE POLICY "authenticated_read_skills" ON public.skills_master
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Seed with the 9 approved skills
INSERT INTO public.skills_master (skill_key, skill_name, category) VALUES
('frontend', 'Frontend', 'engineering'),
('backend', 'Backend', 'engineering'),
('workflows', 'Workflows', 'engineering'),
('database', 'Database', 'engineering'),
('prompting', 'Prompting', 'ai_ml'),
('non_popular_llms', 'Non-Popular LLMs', 'ai_ml'),
('finetuning', 'Finetuning', 'ai_ml'),
('data_labelling_rag', 'Data Labelling/RAG', 'ai_ml'),
('content_generation', 'Content Generation', 'ai_ml')
ON CONFLICT (skill_key) DO NOTHING;


-- ----------------------------------------------------
-- TABLE 2: task_skills (Junction table: tasks <-> skills)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills_master(id) ON DELETE RESTRICT,
    org_id UUID NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT now(),
    manager_approved_late BOOLEAN DEFAULT false,  -- TRUE if late but manager approved
    
    -- Prevent duplicate skill claims on same task
    UNIQUE(task_id, skill_id)
);

-- Enable RLS
ALTER TABLE public.task_skills ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can insert their own skill claims
DROP POLICY IF EXISTS "employees_insert_own_skills" ON public.task_skills;
CREATE POLICY "employees_insert_own_skills" ON public.task_skills
    FOR INSERT
    WITH CHECK (auth.uid() = employee_id);

-- Policy: Users can read skills for their org
DROP POLICY IF EXISTS "org_members_read_skills" ON public.task_skills;
CREATE POLICY "org_members_read_skills" ON public.task_skills
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.org_id = task_skills.org_id
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_skills_employee ON public.task_skills(employee_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_skills_skill ON public.task_skills(skill_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_skills_task ON public.task_skills(task_id);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after migration to confirm setup:
-- SELECT * FROM skills_master ORDER BY category, skill_name;
-- Expected: 9 rows (4 engineering + 5 ai_ml)
