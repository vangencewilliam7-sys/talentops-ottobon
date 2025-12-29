# Task Lifecycle Database Migration
## Supabase SQL Queries - Copy/Paste All at Once

---

> **Instructions**: Copy everything below and paste it into your Supabase SQL Editor, then click "Run".

---

```sql
-- ============================================================
-- TASK LIFECYCLE MIGRATION FOR TALENT OPS
-- Version: 1.0
-- Date: 2025-12-27
-- ============================================================

-- ============================================================
-- STEP 1: CREATE ENUMS FOR LIFECYCLE STATES
-- ============================================================

-- Lifecycle State Enum (the 5 phases + closed)
DO $$ BEGIN
    CREATE TYPE task_lifecycle_state AS ENUM (
        'requirement_refiner',
        'design_guidance', 
        'build_guidance',
        'acceptance_criteria',
        'deployment',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Sub-State Enum (within each lifecycle phase)
DO $$ BEGIN
    CREATE TYPE task_sub_state AS ENUM (
        'in_progress',
        'pending_validation',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Validation Action Enum (for audit log)
DO $$ BEGIN
    CREATE TYPE validation_action AS ENUM (
        'request_validation',
        'cancel_request',
        'approve',
        'reject'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- STEP 2: ADD LIFECYCLE COLUMNS TO TASKS TABLE
-- ============================================================

-- Add lifecycle_state column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS lifecycle_state text DEFAULT 'requirement_refiner';

-- Add sub_state column  
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS sub_state text DEFAULT 'in_progress';

-- Add requested_next_state column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS requested_next_state text;

-- Add validation tracking columns
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS validation_requested_at timestamptz;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES profiles(id);

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS validated_at timestamptz;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS validation_comment text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS rejection_count integer DEFAULT 0;

-- ============================================================
-- STEP 3: CREATE TASK STATE HISTORY TABLE (AUDIT LOG)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_state_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_lifecycle_state text,
    to_lifecycle_state text,
    from_sub_state text,
    to_sub_state text,
    action text NOT NULL,
    actor_id uuid NOT NULL REFERENCES profiles(id),
    actor_role text,
    comment text,
    created_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_state_history_task_id ON task_state_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_state_history_actor_id ON task_state_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_task_state_history_created_at ON task_state_history(created_at DESC);

-- ============================================================
-- STEP 4: CREATE HELPER FUNCTION TO GET NEXT LIFECYCLE STATE
-- ============================================================

CREATE OR REPLACE FUNCTION get_next_lifecycle_state(current_state text)
RETURNS text AS $$
BEGIN
    CASE current_state
        WHEN 'requirement_refiner' THEN RETURN 'design_guidance';
        WHEN 'design_guidance' THEN RETURN 'build_guidance';
        WHEN 'build_guidance' THEN RETURN 'acceptance_criteria';
        WHEN 'acceptance_criteria' THEN RETURN 'deployment';
        WHEN 'deployment' THEN RETURN 'closed';
        ELSE RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- STEP 5: CREATE REQUEST VALIDATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION request_task_validation(
    p_task_id uuid,
    p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
    v_task record;
    v_user_role text;
BEGIN
    -- Get task details
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found');
    END IF;
    
    -- Verify user owns or is assigned to task
    IF v_task.assigned_to != p_user_id AND v_task.assigned_by != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not authorized to request validation for this task');
    END IF;
    
    -- Check if already pending
    IF v_task.sub_state = 'pending_validation' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Validation already requested for this task');
    END IF;
    
    -- Check if task is closed
    IF v_task.lifecycle_state = 'closed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot request validation for closed task');
    END IF;
    
    -- Get user role for audit
    SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
    
    -- Update task to pending validation
    UPDATE tasks SET
        sub_state = 'pending_validation',
        requested_next_state = get_next_lifecycle_state(lifecycle_state),
        validation_requested_at = now(),
        validated_by = NULL,
        validated_at = NULL,
        validation_comment = NULL
    WHERE id = p_task_id;
    
    -- Log to history
    INSERT INTO task_state_history (
        task_id, from_lifecycle_state, to_lifecycle_state,
        from_sub_state, to_sub_state, action, actor_id, actor_role
    ) VALUES (
        p_task_id, v_task.lifecycle_state, v_task.lifecycle_state,
        v_task.sub_state, 'pending_validation', 'request_validation', p_user_id, v_user_role
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Validation requested successfully',
        'current_state', v_task.lifecycle_state,
        'requested_next_state', get_next_lifecycle_state(v_task.lifecycle_state)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 6: CREATE CANCEL VALIDATION REQUEST FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_validation_request(
    p_task_id uuid,
    p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
    v_task record;
    v_user_role text;
BEGIN
    -- Get task details
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found');
    END IF;
    
    -- Verify user owns the task
    IF v_task.assigned_to != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only task owner can cancel validation request');
    END IF;
    
    -- Check if pending
    IF v_task.sub_state != 'pending_validation' THEN
        RETURN jsonb_build_object('success', false, 'message', 'No pending validation request to cancel');
    END IF;
    
    -- Get user role
    SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
    
    -- Update task
    UPDATE tasks SET
        sub_state = 'in_progress',
        requested_next_state = NULL,
        validation_requested_at = NULL
    WHERE id = p_task_id;
    
    -- Log to history
    INSERT INTO task_state_history (
        task_id, from_lifecycle_state, to_lifecycle_state,
        from_sub_state, to_sub_state, action, actor_id, actor_role
    ) VALUES (
        p_task_id, v_task.lifecycle_state, v_task.lifecycle_state,
        'pending_validation', 'in_progress', 'cancel_request', p_user_id, v_user_role
    );
    
    RETURN jsonb_build_object('success', true, 'message', 'Validation request cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 7: CREATE APPROVE TASK FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION approve_task(
    p_task_id uuid,
    p_manager_id uuid,
    p_comment text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_task record;
    v_manager_role text;
    v_next_state text;
    v_new_sub_state text;
BEGIN
    -- Get task details
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found');
    END IF;
    
    -- Get manager role
    SELECT role INTO v_manager_role FROM profiles WHERE id = p_manager_id;
    
    -- Verify manager role
    IF v_manager_role NOT IN ('manager', 'executive') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only managers and executives can approve tasks');
    END IF;
    
    -- Verify not self-approving
    IF v_task.assigned_to = p_manager_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot approve your own task. Another manager must validate.');
    END IF;
    
    -- Check if pending validation
    IF v_task.sub_state != 'pending_validation' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task is not pending validation');
    END IF;
    
    -- Get next lifecycle state
    v_next_state := get_next_lifecycle_state(v_task.lifecycle_state);
    
    -- Determine new sub-state (closed if deployment, otherwise in_progress)
    IF v_next_state = 'closed' THEN
        v_new_sub_state := 'approved';
    ELSE
        v_new_sub_state := 'in_progress';
    END IF;
    
    -- Update task
    UPDATE tasks SET
        lifecycle_state = v_next_state,
        sub_state = v_new_sub_state,
        requested_next_state = NULL,
        validated_by = p_manager_id,
        validated_at = now(),
        validation_comment = p_comment,
        validation_requested_at = NULL,
        rejection_count = 0,
        -- Also update legacy status field for compatibility
        status = CASE WHEN v_next_state = 'closed' THEN 'completed' ELSE status END
    WHERE id = p_task_id;
    
    -- Log to history
    INSERT INTO task_state_history (
        task_id, from_lifecycle_state, to_lifecycle_state,
        from_sub_state, to_sub_state, action, actor_id, actor_role, comment
    ) VALUES (
        p_task_id, v_task.lifecycle_state, v_next_state,
        'pending_validation', v_new_sub_state, 'approve', p_manager_id, v_manager_role, p_comment
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Task approved and advanced to ' || v_next_state,
        'new_lifecycle_state', v_next_state,
        'new_sub_state', v_new_sub_state
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 8: CREATE REJECT TASK FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION reject_task(
    p_task_id uuid,
    p_manager_id uuid,
    p_reason text
)
RETURNS jsonb AS $$
DECLARE
    v_task record;
    v_manager_role text;
BEGIN
    -- Reason is required
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rejection reason is required');
    END IF;
    
    -- Get task details
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found');
    END IF;
    
    -- Get manager role
    SELECT role INTO v_manager_role FROM profiles WHERE id = p_manager_id;
    
    -- Verify manager role
    IF v_manager_role NOT IN ('manager', 'executive') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only managers and executives can reject tasks');
    END IF;
    
    -- Verify not self-rejecting
    IF v_task.assigned_to = p_manager_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot reject your own task');
    END IF;
    
    -- Check if pending validation
    IF v_task.sub_state != 'pending_validation' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task is not pending validation');
    END IF;
    
    -- Update task (stays in same lifecycle state, sub_state goes back to in_progress)
    UPDATE tasks SET
        sub_state = 'in_progress',
        requested_next_state = NULL,
        validated_by = p_manager_id,
        validated_at = now(),
        validation_comment = p_reason,
        validation_requested_at = NULL,
        rejection_count = COALESCE(rejection_count, 0) + 1
    WHERE id = p_task_id;
    
    -- Log to history
    INSERT INTO task_state_history (
        task_id, from_lifecycle_state, to_lifecycle_state,
        from_sub_state, to_sub_state, action, actor_id, actor_role, comment
    ) VALUES (
        p_task_id, v_task.lifecycle_state, v_task.lifecycle_state,
        'pending_validation', 'in_progress', 'reject', p_manager_id, v_manager_role, p_reason
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Task rejected. Feedback: ' || p_reason,
        'lifecycle_state', v_task.lifecycle_state,
        'rejection_count', COALESCE(v_task.rejection_count, 0) + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 9: CREATE GET VALIDATION QUEUE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_validation_queue(p_manager_id uuid)
RETURNS TABLE (
    task_id uuid,
    title text,
    description text,
    lifecycle_state text,
    requested_next_state text,
    assigned_to_name text,
    assigned_to_id uuid,
    validation_requested_at timestamptz,
    team_name text
) AS $$
DECLARE
    v_manager_role text;
    v_manager_team_id uuid;
BEGIN
    -- Get manager info
    SELECT role, team_id INTO v_manager_role, v_manager_team_id 
    FROM profiles WHERE id = p_manager_id;
    
    -- Verify manager role
    IF v_manager_role NOT IN ('manager', 'executive') THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        t.id as task_id,
        t.title,
        t.description,
        t.lifecycle_state,
        t.requested_next_state,
        p.full_name as assigned_to_name,
        t.assigned_to as assigned_to_id,
        t.validation_requested_at,
        tm.team_name
    FROM tasks t
    JOIN profiles p ON t.assigned_to = p.id
    LEFT JOIN teams tm ON p.team_id = tm.id
    WHERE t.sub_state = 'pending_validation'
    AND t.assigned_to != p_manager_id  -- Exclude own tasks
    AND (
        v_manager_role = 'executive'  -- Executives see all
        OR p.team_id = v_manager_team_id  -- Managers see their team
    )
    ORDER BY t.validation_requested_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 10: CREATE GET TASK HISTORY FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_task_history(p_task_id uuid)
RETURNS TABLE (
    id uuid,
    from_lifecycle_state text,
    to_lifecycle_state text,
    from_sub_state text,
    to_sub_state text,
    action text,
    actor_name text,
    actor_role text,
    comment text,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.from_lifecycle_state,
        h.to_lifecycle_state,
        h.from_sub_state,
        h.to_sub_state,
        h.action,
        p.full_name as actor_name,
        h.actor_role,
        h.comment,
        h.created_at
    FROM task_state_history h
    JOIN profiles p ON h.actor_id = p.id
    WHERE h.task_id = p_task_id
    ORDER BY h.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 11: ENABLE RLS ON TASK STATE HISTORY
-- ============================================================

ALTER TABLE task_state_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history for tasks they have access to
CREATE POLICY "Users can view task history"
ON task_state_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_state_history.task_id
        AND (
            t.assigned_to = auth.uid()
            OR t.assigned_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role IN ('manager', 'executive')
            )
        )
    )
);

-- ============================================================
-- STEP 12: MIGRATE EXISTING TASKS (Set default lifecycle state)
-- ============================================================

-- Set all existing tasks to requirement_refiner/in_progress
UPDATE tasks 
SET 
    lifecycle_state = 'requirement_refiner',
    sub_state = 'in_progress'
WHERE lifecycle_state IS NULL OR lifecycle_state = '';

-- Mark completed tasks as closed
UPDATE tasks 
SET 
    lifecycle_state = 'closed',
    sub_state = 'approved'
WHERE status = 'completed';

-- ============================================================
-- DONE! All migrations complete.
-- ============================================================
```
