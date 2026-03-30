-- ==============================================================================
-- RPCs: update_announcement_status & delete_announcement
-- Purpose: Complete the suite of Announcement RPCs for full security.
-- ==============================================================================

-- 1. UPDATE STATUS RPC
CREATE OR REPLACE FUNCTION update_announcement_status(
    p_announcement_id uuid,
    p_status text, -- 'active', 'completed', 'future'
    p_org_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_org_id uuid;
BEGIN
    -- Security Check: Ensure user belongs to the requested organization
    SELECT org_id INTO v_user_org_id FROM public.profiles WHERE id = auth.uid();
    
    IF v_user_org_id IS NULL OR v_user_org_id <> p_org_id THEN
        RETURN json_build_object('success', false, 'error', 'Organization mismatch or profile not found');
    END IF;

    UPDATE public.announcements
    SET status = p_status
    WHERE id = p_announcement_id
    AND org_id = p_org_id;

    IF FOUND THEN
        RETURN json_build_object('success', true);
    ELSE
        RETURN json_build_object('success', false, 'error', 'Announcement not found in this organization');
    END IF;
END;
$$;


-- 2. DELETE ANNOUNCEMENT RPC
CREATE OR REPLACE FUNCTION delete_announcement(
    p_announcement_id uuid,
    p_org_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_org_id uuid;
BEGIN
    -- Security Check: Ensure user belongs to the requested organization
    SELECT org_id INTO v_user_org_id FROM public.profiles WHERE id = auth.uid();

    IF v_user_org_id IS NULL OR v_user_org_id <> p_org_id THEN
        RETURN json_build_object('success', false, 'error', 'Organization mismatch or profile not found');
    END IF;

    DELETE FROM public.announcements
    WHERE id = p_announcement_id
    AND org_id = p_org_id;

    IF FOUND THEN
        RETURN json_build_object('success', true);
    ELSE
         RETURN json_build_object('success', false, 'error', 'Announcement not found in this organization');
    END IF;
END;
$$;

-- Grant permissions for both
GRANT EXECUTE ON FUNCTION update_announcement_status(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_announcement(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
