
-- =============================================
-- 2. HARDENED CLOCK OUT
-- =============================================
-- Logic: 
-- 1. Finds the most recent open session for the authenticated user.
-- 2. Closes it and calculates total duration.
-- 3. Dynamically sets status (Half Day/Present) based on hours.

CREATE OR REPLACE FUNCTION check_out()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_session_id uuid;
    v_check_in_date date;
    v_check_in_time time;
    v_actual_check_in timestamptz;
    v_duration interval;
    v_hours numeric;
BEGIN
    v_user_id := auth.uid();

    -- 1. Find the active session (the most recent one without a logout)
    SELECT id, date, check_in INTO v_session_id, v_check_in_date, v_check_in_time
    FROM public.attendance
    WHERE employee_id = v_user_id 
    AND check_out IS NULL
    ORDER BY date DESC, check_in DESC
    LIMIT 1;

    IF v_session_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No active session found. Did you forget to clock in?');
    END IF;

    -- 2. Calculate duration safely by combining the exact date and time
    v_actual_check_in := v_check_in_date + v_check_in_time;
    v_duration := NOW() - v_actual_check_in;
    v_hours := EXTRACT(EPOCH FROM v_duration) / 3600;

    -- Prevent negative hours in case of time sync issues or manual data manipulation
    IF v_hours < 0 THEN
        v_hours := 0;
    END IF;

    -- 3. Update record with tenant safety
    UPDATE public.attendance
    SET 
        check_out = CURRENT_TIME,
        total_hours = ROUND(v_hours::numeric, 2), -- Save the calculated hours
        status = CASE 
            WHEN v_hours < 4 THEN 'half_day'
            ELSE 'present'
        END
    WHERE id = v_session_id;

    RETURN json_build_object(
        'success', true, 
        'message', 'Checked out successfully', 
        'hours_logged', ROUND(v_hours::numeric, 2)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
