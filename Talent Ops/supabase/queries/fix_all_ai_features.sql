
-- ==============================================================================
-- MASTER FIX FOR AI-NATIVE FEATURES
-- 1. Fixes AI Risk Metrics (Missing expected_progress, velocity)
-- 2. Fixes AI Planning Context (RPC Signature Mismatch)
-- 3. Fixes AI Bulk Save (Column Names)
-- ==============================================================================

-- 1. ENHANCED RISK METRICS RPC
CREATE OR REPLACE FUNCTION rpc_compute_task_risk_metrics(p_task_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_task record;
    v_steps_completed int;
    v_total_steps int;
    v_elapsed_hours numeric;
    v_predicted_total numeric;
    v_predicted_delay numeric;
    v_progress_ratio numeric;
    v_expected_progress numeric;
    v_velocity numeric;
    v_risk_level text;
    v_phase_progress numeric := 0;
    v_active_phases_count int;
    v_completed_phases_count int := 0;
    v_phase_key text;
BEGIN
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- Calculate Elapsed Time
    v_elapsed_hours := EXTRACT(EPOCH FROM (now() - COALESCE(v_task.started_at, v_task.created_at))) / 3600;
    
    -- Progress Calculation (Step based or Phase based)
    SELECT count(*), count(*) FILTER (WHERE status = 'completed')
    INTO v_total_steps, v_steps_completed
    FROM task_steps WHERE task_id = p_task_id;

    IF v_task.phase_validations ? 'active_phases' THEN
        SELECT count(*) INTO v_active_phases_count 
        FROM jsonb_array_elements_text(v_task.phase_validations->'active_phases') AS p 
        WHERE p != 'closed';

        IF v_active_phases_count > 0 THEN
            FOR v_phase_key IN SELECT jsonb_array_elements_text(v_task.phase_validations->'active_phases')
            LOOP
                IF v_phase_key != 'closed' AND (v_task.phase_validations->v_phase_key->>'status' = 'approved') THEN
                    v_completed_phases_count := v_completed_phases_count + 1;
                END IF;
            END LOOP;
            v_phase_progress := v_completed_phases_count::numeric / v_active_phases_count;
        END IF;
    END IF;

    IF v_total_steps > 0 THEN
        v_progress_ratio := v_steps_completed::numeric / v_total_steps;
    ELSE
        v_progress_ratio := v_phase_progress;
    END IF;

    -- Advanced Metrics for AI
    v_expected_progress := CASE 
        WHEN COALESCE(v_task.allocated_hours, 0) > 0 THEN LEAST(1, v_elapsed_hours / v_task.allocated_hours)
        ELSE 0 
    END;
    
    v_velocity := CASE 
        WHEN v_elapsed_hours > 0 THEN v_progress_ratio / v_elapsed_hours
        ELSE 0 
    END;

    -- Prediction Logic
    IF v_progress_ratio > 0 THEN
        v_predicted_total := v_elapsed_hours / v_progress_ratio;
        v_predicted_delay := GREATEST(0, v_predicted_total - v_task.allocated_hours);
    ELSE
        IF v_elapsed_hours > v_task.allocated_hours THEN
            v_predicted_delay := v_elapsed_hours - v_task.allocated_hours;
            v_predicted_total := v_elapsed_hours + v_task.allocated_hours;
        ELSE
            v_predicted_delay := 0;
            v_predicted_total := v_task.allocated_hours;
        END IF;
    END IF;

    IF v_predicted_delay > 2 OR v_predicted_delay > (v_task.allocated_hours * 0.2) THEN 
        v_risk_level := 'high';
    ELSIF v_predicted_delay > 0.5 THEN 
        v_risk_level := 'medium';
    ELSE 
        v_risk_level := 'low';
    END IF;

    RETURN jsonb_build_object(
        'task_id', p_task_id,
        'org_id', v_task.org_id,
        'allocated_hours', v_task.allocated_hours,
        'elapsed_hours', round(v_elapsed_hours, 2),
        'progress_ratio', round(v_progress_ratio, 4), 
        'expected_progress', round(v_expected_progress, 4),
        'velocity', round(v_velocity, 3),
        'predicted_delay_hours', round(v_predicted_delay, 2),
        'risk_level', v_risk_level, -- Standardize on 'risk_level'
        'base_risk_level', v_risk_level, -- Backwards compatibility
        'total_steps', v_total_steps,
        'steps_completed', v_steps_completed
    );
END;
$$;


-- 2. FLEXIBLE PLANNING CONTEXT RPC
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


-- 3. ROBUST BULK SAVE RPC
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
    SELECT org_id, assigned_by INTO v_org_id, v_manager_id FROM tasks WHERE id = p_task_id;

    UPDATE tasks SET ai_metadata = p_ai_metadata WHERE id = p_task_id;

    -- Clear existing steps to avoid duplicates if regenerating
    DELETE FROM task_steps WHERE task_id = p_task_id;

    FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
    LOOP
        INSERT INTO task_steps (
            org_id, task_id, stage_id, step_title, 
            estimated_hours, order_index, status, created_by, created_by_role
        )
        VALUES (
            v_org_id, p_task_id, v_step->>'phase', v_step->>'title',
            COALESCE((v_step->>'hours')::numeric, 4), 
            COALESCE((v_step->>'index')::int, v_step_count),
            'pending', v_manager_id, 'manager'
        );

        v_total_hours := v_total_hours + COALESCE((v_step->>'hours')::numeric, 4);
        v_step_count := v_step_count + 1;
    END LOOP;

    UPDATE tasks
    SET allocated_hours = v_total_hours, total_points = v_total_hours * 10
    WHERE id = p_task_id;

    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;
