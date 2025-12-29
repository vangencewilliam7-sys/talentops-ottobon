-- ============================================
-- PROOF-BASED VALIDATION MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 0. Drop existing functions first (required when changing signatures)
DROP FUNCTION IF EXISTS get_validation_queue(uuid);
DROP FUNCTION IF EXISTS request_task_validation(uuid, uuid);
DROP FUNCTION IF EXISTS request_task_validation(uuid, uuid, text);

-- 1. Add proof_url column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMPTZ;

-- 2. Create storage bucket for task proofs (run in Supabase Dashboard > Storage)
-- Name: task-proofs
-- Public: false

-- 3. Storage policies (run in Supabase SQL Editor)
-- Allow authenticated users to upload to task-proofs bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-proofs', 'task-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own task proofs
CREATE POLICY "Users can upload task proofs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'task-proofs'
);

-- Policy: Users can view task proofs (managers and task owners)
CREATE POLICY "Users can view task proofs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'task-proofs');

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update task proofs" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'task-proofs');

-- 4. Update request_task_validation function to include proof_url
CREATE OR REPLACE FUNCTION request_task_validation(
    p_task_id UUID,
    p_user_id UUID,
    p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task RECORD;
    v_current_phase TEXT;
    v_next_phase TEXT;
BEGIN
    -- Get current task
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found');
    END IF;
    
    -- Check if user owns the task
    IF v_task.assigned_to != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized');
    END IF;
    
    -- Check if proof is provided
    IF p_proof_url IS NULL OR p_proof_url = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Proof document is required for validation request');
    END IF;
    
    -- Check current sub_state
    IF v_task.sub_state != 'in_progress' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task is not in progress');
    END IF;
    
    v_current_phase := COALESCE(v_task.lifecycle_state, 'requirement_refiner');
    
    -- Determine next phase
    v_next_phase := CASE v_current_phase
        WHEN 'requirement_refiner' THEN 'design_guidance'
        WHEN 'design_guidance' THEN 'build_guidance'
        WHEN 'build_guidance' THEN 'acceptance_criteria'
        WHEN 'acceptance_criteria' THEN 'deployment'
        WHEN 'deployment' THEN 'closed'
        ELSE 'closed'
    END;
    
    -- Update task with proof and pending validation
    UPDATE tasks 
    SET sub_state = 'pending_validation',
        proof_url = p_proof_url,
        proof_submitted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_task_id;
    
    -- Log the action
    INSERT INTO task_state_history (task_id, from_state, to_state, action, actor_id, comment)
    VALUES (p_task_id, v_current_phase, v_current_phase, 'request_validation', p_user_id, 'Proof submitted: ' || p_proof_url);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Validation requested with proof',
        'current_phase', v_current_phase,
        'requested_next_phase', v_next_phase
    );
END;
$$;

-- 5. Update get_validation_queue to include proof_url
CREATE OR REPLACE FUNCTION get_validation_queue(p_manager_id UUID)
RETURNS TABLE(
    task_id UUID,
    title TEXT,
    description TEXT,
    lifecycle_state TEXT,
    requested_next_state TEXT,
    assigned_to UUID,
    assigned_to_name TEXT,
    proof_url TEXT,
    proof_submitted_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as task_id,
        t.title,
        t.description,
        t.lifecycle_state,
        CASE t.lifecycle_state
            WHEN 'requirement_refiner' THEN 'design_guidance'
            WHEN 'design_guidance' THEN 'build_guidance'
            WHEN 'build_guidance' THEN 'acceptance_criteria'
            WHEN 'acceptance_criteria' THEN 'deployment'
            WHEN 'deployment' THEN 'closed'
            ELSE 'closed'
        END as requested_next_state,
        t.assigned_to,
        COALESCE(p.full_name, 'Unknown') as assigned_to_name,
        t.proof_url,
        t.proof_submitted_at,
        t.updated_at as requested_at
    FROM tasks t
    LEFT JOIN profiles p ON t.assigned_to = p.id
    WHERE t.sub_state = 'pending_validation'
    ORDER BY t.updated_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION request_task_validation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_validation_queue(UUID) TO authenticated;
