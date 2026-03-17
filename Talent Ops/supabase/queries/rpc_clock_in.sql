
-- =============================================
-- 1. HARDENED CLOCK IN
-- =============================================
-- Logic: 
-- 1. Identifies the user and their organization.
-- 2. Blocks if the user has ANY open session (missing check_out).
-- 3. Records org_id for multi-tenancy isolation.

CREATE OR REPLACE FUNCTION check_in()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
    v_open_session_id uuid;
    v_open_session_date date;
BEGIN
    v_user_id := auth.uid();

    -- 1. Fetch Organization ID from profile
    SELECT org_id INTO v_org_id 
    FROM public.profiles 
    WHERE id = v_user_id;

    IF v_org_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User profile or organization not found.');
    END IF;

    -- 2. Check for ANY existing open session (across all time)
    -- This prevents "time drift" errors where a user forgot to clock out yesterday.
    SELECT id, date INTO v_open_session_id, v_open_session_date
    FROM public.attendance
    WHERE employee_id = v_user_id 
    AND check_out IS NULL
    LIMIT 1;

    IF v_open_session_id IS NOT NULL THEN
        IF v_open_session_date < CURRENT_DATE THEN
            -- It's a "ghost session" from a previous day! 
            -- Auto-close it (e.g., set check_out to 8 hours after check_in) so they aren't permanently locked out of the DB.
            UPDATE public.attendance 
            SET check_out = check_in + interval '8 hours',
                status = 'half_day', -- or any preferred auto-close status
                total_hours = 8
            WHERE id = v_open_session_id;
        ELSE
            -- It's an open session from TODAY. Deny new check-in.
            RETURN json_build_object('success', false, 'error', 'You have an active session for today. Please clock out first.');
        END IF;
    END IF;

    -- 3. Insert new tenant-aware record
    INSERT INTO public.attendance (
        employee_id,
        org_id, -- CRITICAL: For isolation
        date,
        check_in,
        status,
        created_at
    ) VALUES (
        v_user_id,
        v_org_id,
        CURRENT_DATE,
        NOW(),
        'present',
        NOW()
    );

    RETURN json_build_object('success', true, 'message', 'Clocked in successfully');

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
