-- Create task_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.task_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID, -- Assuming org_id is just a UUID, no FK constraint specified in requirements
    submission_time TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for task_submissions
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for authenticated users" ON public.task_submissions
    FOR ALL
    USING (auth.uid() = employee_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin', 'executive')
    ));

-- Create skills_master table
CREATE TABLE IF NOT EXISTS public.skills_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_key TEXT UNIQUE NOT NULL,
    skill_name TEXT NOT NULL
);

-- Enable RLS for skills_master
ALTER TABLE public.skills_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" ON public.skills_master
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create task_submission_skills table (Write Table)
CREATE TABLE IF NOT EXISTS public.task_submission_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_submission_id UUID REFERENCES public.task_submissions(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills_master(id) ON DELETE CASCADE,
    org_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for task_submission_skills
ALTER TABLE public.task_submission_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for authenticated users" ON public.task_submission_skills
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Seed skills_master with some default skills
INSERT INTO public.skills_master (skill_key, skill_name) VALUES
('frontend_dev', 'Frontend Development'),
('backend_dev', 'Backend Development'),
('database_design', 'Database Design'),
('api_integration', 'API Integration'),
('ui_ux_design', 'UI/UX Design'),
('project_management', 'Project Management'),
('testing_qa', 'Testing & QA'),
('devops', 'DevOps'),
('cloud_infrastructure', 'Cloud Infrastructure'),
('security_compliance', 'Security & Compliance'),
('data_analysis', 'Data Analysis'),
('documentation', 'Documentation'),
('communication', 'Communication'),
('problem_solving', 'Problem Solving'),
('client_facing', 'Client Facing')
ON CONFLICT (skill_key) DO NOTHING;
