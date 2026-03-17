-- =============================================
-- MIGRATION: Organization Holidays
-- =============================================
-- Description: Creates the organization_holidays table and RPCs for bulk insertion.

-- 0. Helper Function (If it doesn't exist yet)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE TABLE IF NOT EXISTS public.organization_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    holiday_name TEXT NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type TEXT DEFAULT 'company', -- 'public', 'company', 'optional'
    region TEXT, -- optional for location-specific holidays
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(org_id, holiday_date) -- Prevent duplicate holidays on the same day for an org
);

-- 2. Enable RLS
ALTER TABLE public.organization_holidays ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Everyone in the org can read the holidays
CREATE POLICY "org_holidays_read_all" ON public.organization_holidays
    FOR SELECT
    USING (org_id = get_my_org_id());

-- Only Executives/Admins/Managers can insert/update/delete 
CREATE POLICY "org_holidays_manage_exec" ON public.organization_holidays
    FOR ALL
    USING (
        org_id = get_my_org_id() AND
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('executive', 'hr', 'admin', 'manager')))
    )
    WITH CHECK (
        org_id = get_my_org_id() AND
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('executive', 'hr', 'admin', 'manager')))
    );

-- 4. Bulk Insert RPC
-- Allows the frontend to push a parsed array of holidays cleanly.
CREATE OR REPLACE FUNCTION rpc_setup_organization_holidays(
    p_holidays JSONB -- Array of { "holiday_date": "YYYY-MM-DD", "holiday_name": "Christmas", "holiday_type": "public" }
) 
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_role TEXT;
    v_inserted_count INT := 0;
    holiday JSONB;
BEGIN
    -- 1. Authenticate & Authorize
    v_org_id := get_my_org_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Verify role (HR/Admin/Executive/Manager can manage)
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role NOT IN ('executive', 'hr', 'admin', 'super_admin', 'manager') THEN
        RAISE EXCEPTION 'Insufficient permissions to setup holidays. Must be Manager or Executive.';
    END IF;

    -- 2. Loop through JSON array and insert/upsert
    FOR holiday IN SELECT * FROM jsonb_array_elements(p_holidays)
    LOOP
        INSERT INTO public.organization_holidays (
            org_id,
            holiday_name,
            holiday_date,
            holiday_type,
            created_by
        ) VALUES (
            v_org_id,
            holiday->>'holiday_name',
            (holiday->>'holiday_date')::DATE,
            COALESCE(holiday->>'holiday_type', 'company'),
            auth.uid()
        )
        ON CONFLICT (org_id, holiday_date) 
        DO UPDATE SET 
            holiday_name = EXCLUDED.holiday_name,
            holiday_type = EXCLUDED.holiday_type;

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true, 
        'message', format('Successfully synced %s holidays.', v_inserted_count),
        'count', v_inserted_count
    );
END;
$$;
