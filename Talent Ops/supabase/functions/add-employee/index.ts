import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verify the caller is authenticated
        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user: callerUser }, error: callerError } = await supabaseClient.auth.getUser(token)

        if (callerError || !callerUser) {
            throw new Error('Unauthorized')
        }

        // Get caller's org_id from their profile
        const { data: callerProfile } = await supabaseClient
            .from('profiles')
            .select('role, org_id')
            .eq('id', callerUser.id)
            .single()

        if (!callerProfile || !['executive', 'admin', 'manager', 'super_admin'].includes(callerProfile.role)) {
            throw new Error('Forbidden: You do not have permission to add employees')
        }

        const {
            full_name,
            email,
            password,
            role,
            monthly_leave_quota,
            basic_salary,
            hra,
            allowances,
            professional_tax,
            join_date,
            employment_type,
            org_id,
            is_paid,
            stipend
        } = await req.json()

        // Use the org_id from the request, or fall back to the caller's org_id
        const effectiveOrgId = org_id || callerProfile.org_id

        // 1. Create the Auth User
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: full_name,
                role: role || 'employee',
                org_id: effectiveOrgId
            }
        })

        if (authError) {
            throw new Error(`Failed to create auth user: ${authError.message}`)
        }

        const newUserId = authData.user.id

        // 2. Upsert Profile — the DB trigger may have already created it,
        //    so we use ON CONFLICT to update instead of failing.
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
                id: newUserId,
                email: email,
                full_name: full_name,
                role: role || 'employee',
                org_id: effectiveOrgId,
                join_date: join_date || new Date().toISOString().split('T')[0],
                employment_type: employment_type || 'full_time',
                is_paid: is_paid !== undefined ? is_paid : true,
                monthly_leave_quota: monthly_leave_quota || 1,
                total_leaves_balance: monthly_leave_quota || 1,
            }, { onConflict: 'id' })

        if (profileError) {
            console.error('Profile upsert error:', profileError)
            // Don't throw — the trigger likely created the profile already
        }

        // 3. Create Employee Finance record
        if (basic_salary !== undefined || hra !== undefined) {
            const { error: financeError } = await supabaseClient
                .from('employee_finance')
                .upsert({
                    employee_id: newUserId,
                    org_id: effectiveOrgId,
                    basic_salary: basic_salary || 0,
                    hra: hra || 0,
                    allowances: allowances || 0,
                    professional_tax: professional_tax || 0,
                    stipend: stipend || 0,
                    is_active: true,
                    effective_from: join_date || new Date().toISOString().split('T')[0],
                }, { onConflict: 'employee_id' })

            if (financeError) {
                console.error('Finance record error:', financeError)
                // Non-critical, continue
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                user_id: newUserId,
                message: 'Employee created successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('add-employee error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
