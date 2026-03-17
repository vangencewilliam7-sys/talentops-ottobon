-- =============================================
-- GET MY ATTENDANCE STATUS
-- =============================================
-- Logic: 
-- 1. Returns the current day's active or last session.
-- 2. Maps check_in to clock_in for frontend compatibility.

CREATE OR REPLACE FUNCTION get_my_attendance_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'clock_in', check_in,
      'clock_out', check_out,
      'current_task', current_task
    )
    FROM public.attendance
    WHERE employee_id = auth.uid()
    AND date = CURRENT_DATE
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$;
