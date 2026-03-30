CREATE OR REPLACE FUNCTION get_my_payroll_history(p_org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_profile_org_id uuid;
    v_results json;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Security check: ensure user belongs to the requested org
    SELECT org_id INTO v_profile_org_id FROM public.profiles WHERE id = v_user_id;
    IF v_profile_org_id != p_org_id THEN
        RETURN json_build_object('success', false, 'error', 'Organization mismatch');
    END IF;

    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'month', p.month,
            'year', TO_CHAR(p.created_at, 'YYYY'),
            'basic_salary', p.basic_salary,
            'hra', p.hra,
            'allowances', p.allowances,
            'deductions', p.deductions,
            'professional_tax', p.professional_tax,
            'lop_days', p.lop_days,
            'net_salary', p.net_salary,
            'status', p.status,
            'created_at', p.created_at,
            'total_working_days', p.total_working_days,
            'present_days', p.present_days,
            'leave_days', p.leave_days
        ) ORDER BY p.created_at DESC
    ) INTO v_results
    FROM public.payroll p
    WHERE p.employee_id = v_user_id AND p.org_id = p_org_id;

    RETURN json_build_object('success', true, 'data', COALESCE(v_results, '[]'::json));
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_payroll_history(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
