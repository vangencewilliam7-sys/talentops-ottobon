
-- Fix RLS Policies for notifications table

-- 1. Enable RLS (if not already enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Authenticated users can INSERT notifications
-- We allow this so the client-side services can send alerts.
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Policy: Users can view notifications where they are the receiver
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = receiver_id);

-- 4. Policy: Users can update notifications they received (to mark as read)
DROP POLICY IF EXISTS "Users can update own received notifications" ON public.notifications;
CREATE POLICY "Users can update own received notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id);

-- 5. Policy: Users can delete their own notifications (optional)
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = receiver_id);

-- Grant permissions to authenticated role
GRANT ALL ON public.notifications TO authenticated;

-- 6. Fix RLS for conversation_indexes
ALTER TABLE public.conversation_indexes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can upsert indexes" ON public.conversation_indexes;
CREATE POLICY "Authenticated users can upsert indexes"
ON public.conversation_indexes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON public.conversation_indexes TO authenticated;
