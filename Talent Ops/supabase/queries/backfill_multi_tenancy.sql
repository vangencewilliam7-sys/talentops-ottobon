-- MULTI-TENANCY BACKFILL SCRIPT
-- This script populates missing org_id values in all sub-tables by referencing parent records.
-- Use this to prepare the database for strict Row Level Security (RLS) enforcement.

BEGIN;

-- 1. Leaves (Populate from profiles)
UPDATE public.leaves l
SET org_id = p.org_id
FROM public.profiles p
WHERE l.employee_id = p.id 
AND l.org_id IS NULL 
AND p.org_id IS NOT NULL;

-- 2. Attendance (Populate from profiles)
UPDATE public.attendance a
SET org_id = p.org_id
FROM public.profiles p
WHERE a.employee_id = p.id 
AND a.org_id IS NULL 
AND p.org_id IS NOT NULL;

-- 3. Tasks (Populate from projects)
UPDATE public.tasks t
SET org_id = pr.org_id
FROM public.projects pr
WHERE t.project_id = pr.id 
AND t.org_id IS NULL 
AND pr.org_id IS NOT NULL;

-- 4. Task Submissions (Populate from tasks)
UPDATE public.task_submissions ts
SET org_id = t.org_id
FROM public.tasks t
WHERE ts.task_id = t.id 
AND ts.org_id IS NULL 
AND t.org_id IS NOT NULL;

-- 5. Notifications (Populate from profiles - receiver)
UPDATE public.notifications n
SET org_id = p.org_id
FROM public.profiles p
WHERE n.receiver_id = p.id 
AND n.org_id IS NULL 
AND p.org_id IS NOT NULL;

-- 6. Conversations (Populate from creator or member)
UPDATE public.conversations c
SET org_id = p.org_id
FROM public.conversation_members cm
JOIN public.profiles p ON cm.user_id = p.id
WHERE c.id = cm.conversation_id
AND c.org_id IS NULL
AND p.org_id IS NOT NULL;

-- 7. Messages (Populate from conversations)
UPDATE public.messages m
SET org_id = c.org_id
FROM public.conversations c
WHERE m.conversation_id = c.id 
AND m.org_id IS NULL 
AND c.org_id IS NOT NULL;

-- 8. Attachments (Populate from messages)
UPDATE public.attachments a
SET org_id = m.org_id
FROM public.messages m
WHERE a.message_id = m.id 
AND a.org_id IS NULL 
AND m.org_id IS NOT NULL;

-- 9. Message Reactions (Populate from messages)
UPDATE public.message_reactions mr
SET org_id = m.org_id
FROM public.messages m
WHERE mr.message_id = m.id 
AND mr.org_id IS NULL 
AND m.org_id IS NOT NULL;

-- 10. Poll Votes (Populate from messages)
UPDATE public.poll_votes pv
SET org_id = m.org_id
FROM public.messages m
WHERE pv.message_id = m.id 
AND pv.org_id IS NULL 
AND m.org_id IS NOT NULL;

-- 11. Payroll (Populate from profiles)
UPDATE public.payroll pay
SET org_id = p.org_id
FROM public.profiles p
WHERE pay.employee_id = p.id 
AND pay.org_id IS NULL 
AND p.org_id IS NOT NULL;

-- 12. Project Documents (Populate from projects)
-- (Checking if tables exist in various possible names based on project history)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_documents') THEN
        UPDATE public.project_documents pd
        SET org_id = pr.org_id
        FROM public.projects pr
        WHERE pd.project_id = pr.id 
        AND pd.org_id IS NULL 
        AND pr.org_id IS NOT NULL;
    END IF;
END $$;

-- 13. Employee Finance (Populate from profiles)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_finance') THEN
        UPDATE public.employee_finance ef
        SET org_id = p.org_id
        FROM public.profiles p
        WHERE ef.employee_id = p.id 
        AND ef.org_id IS NULL 
        AND p.org_id IS NOT NULL;
    END IF;
END $$;

-- 14. Employee Reviews (Populate from profiles)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_reviews') THEN
        UPDATE public.employee_reviews er
        SET org_id = p.org_id
        FROM public.profiles p
        WHERE er.employee_id = p.id 
        AND er.org_id IS NULL 
        AND p.org_id IS NOT NULL;
    END IF;
END $$;

COMMIT;
