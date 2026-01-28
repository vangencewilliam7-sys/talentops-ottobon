
-- Update RLS policies to allow insert
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON public.task_submissions;
CREATE POLICY "Enable read/write for authenticated users" ON public.task_submissions
    FOR ALL
    USING (auth.uid() = employee_id OR auth.role() = 'authenticated');

-- Also check constraints
ALTER TABLE public.task_submissions ALTER COLUMN submission_time SET DEFAULT now();
