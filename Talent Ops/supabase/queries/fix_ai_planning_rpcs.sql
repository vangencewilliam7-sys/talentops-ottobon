
-- 1. Fix rpc_get_similar_task_context signature and logic
-- Update it to accept title, description AND skill tags to be flexible
CREATE OR REPLACE FUNCTION rpc_get_similar_task_context(
    p_title text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_skill_tags text[] DEFAULT NULL,
    p_limit int DEFAULT 3
)
RETURNS TABLE (
    task_title text,
    step_titles text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.title as task_title,
        array_agg(ts.step_title ORDER BY ts.order_index) as step_titles
    FROM tasks t
    JOIN task_steps ts ON t.id = ts.task_id
    WHERE 
        (
            (p_skill_tags IS NOT NULL AND t.skills && p_skill_tags)
            OR 
            (p_title IS NOT NULL AND t.title ILIKE '%' || p_title || '%')
        )
        AND t.created_at > (now() - interval '6 months')
    GROUP BY t.id, t.title, t.created_at
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 2. Fix rpc_bulk_save_task_plan column names
CREATE OR REPLACE FUNCTION rpc_bulk_save_task_plan(
    p_task_id uuid,
    p_steps jsonb,       -- Expected: Array of { "phase": "...", "title": "...", "hours": 2, "index": 1 }
    p_ai_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_step jsonb;
    v_total_hours numeric := 0;
    v_step_count int := 0;
    v_org_id uuid;
    v_manager_id uuid;
BEGIN
    -- Get task info for relationship logic
    SELECT org_id, assigned_by INTO v_org_id, v_manager_id FROM tasks WHERE id = p_task_id;

    -- A. Update Task Metadata (Risks, Assumptions)
    UPDATE tasks 
    SET ai_metadata = p_ai_metadata
    WHERE id = p_task_id;

    -- B. Insert Steps
    FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
    LOOP
        INSERT INTO task_steps (
            org_id,
            task_id,
            stage_id,
            step_title,
            estimated_hours,
            order_index,
            status,
            created_by,
            created_by_role,
            created_at
        )
        VALUES (
            v_org_id,
            p_task_id,
            v_step->>'phase',
            v_step->>'title',
            COALESCE((v_step->>'hours')::numeric, 4),
            COALESCE((v_step->>'index')::int, v_step_count),
            'pending',
            v_manager_id,
            'manager',
            now()
        );

        -- Accumulate stats
        v_total_hours := v_total_hours + COALESCE((v_step->>'hours')::numeric, 4);
        v_step_count := v_step_count + 1;
    END LOOP;

    -- C. Update Task Stats using correct column names from chunk1
    UPDATE tasks
    SET 
        allocated_hours = v_total_hours,
        total_points = v_total_hours * 10
    WHERE id = p_task_id;

    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;
