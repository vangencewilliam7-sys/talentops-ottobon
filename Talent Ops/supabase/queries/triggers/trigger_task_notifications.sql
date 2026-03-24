-- ==========================================
-- TRIGGER: TASK ASSIGNMENT NOTIFICATIONS
-- ==========================================
-- Automatically creates a robust notification 
-- whenever a new task is inserted with an assignee.
-- It fully respects Multi-Tenancy (org_id).

CREATE OR REPLACE FUNCTION public.handle_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
BEGIN
    -- Only trigger if assigned_to is present and different from assigned_by
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.assigned_by THEN
        -- Safely get the sender name
        SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.assigned_by;
        IF sender_name IS NULL THEN
            sender_name := 'System / Manager';
        END IF;

        -- Insert notification with org_id for multi-tenancy
        INSERT INTO public.notifications (
            receiver_id,
            sender_id,
            sender_name,
            message,
            type,
            is_read,
            org_id,
            created_at
        ) VALUES (
            NEW.assigned_to,
            NEW.assigned_by,
            sender_name,
            'You have been assigned a new task: ' || NEW.title,
            'task_assigned',
            false,
            NEW.org_id,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists to allow safe re-running
DROP TRIGGER IF EXISTS on_task_created ON public.tasks;

-- Create the trigger binding
CREATE TRIGGER on_task_created
    AFTER INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_task_assignment();
