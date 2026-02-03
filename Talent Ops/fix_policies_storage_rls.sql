-- ============================================
-- FIX POLICIES STORAGE & RLS
-- ============================================

-- 1. Ensure the 'policies' bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('policies', 'policies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Clear existing policies to avoid conflicts
-- NOTE: We use DO blocks to safely handle potential policy changes
DO $$
BEGIN
    -- Drop existing policies for the 'policies' bucket
    DELETE FROM storage.policies WHERE bucket_id = 'policies';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error clearing policies: %', SQLERRM;
END $$;

-- 3. Create fresh policies for the 'policies' bucket

-- ALLOW PUBLIC ACCESS (READ)
-- Everyone should be able to view/download policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'policies' );

-- ALLOW AUTHENTICATED UPLOAD
-- Any logged-in user can upload (usually restricted by UI, but RLS needs to allow it)
-- To be safer, we could restrict this to 'authenticated' role
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'policies' AND auth.role() = 'authenticated' );

-- ALLOW AUTHENTICATED UPDATE
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'policies' AND auth.role() = 'authenticated' );

-- ALLOW AUTHENTICATED DELETE
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'policies' AND auth.role() = 'authenticated' );

-- 4. Ensure the 'policies' table in public schema has correct RLS too
-- (The error was from storage, but let's fix the table too just in case)
ALTER TABLE IF EXISTS public.policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view policies" ON public.policies;
CREATE POLICY "Anyone can view policies"
ON public.policies FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage policies" ON public.policies;
CREATE POLICY "Authenticated users can manage policies"
ON public.policies FOR ALL
USING (auth.role() = 'authenticated');
