import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0"
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

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

        // Verify the caller is a Super Admin
        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) throw new Error('Unauthorized')

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'super_admin') throw new Error('Forbidden: Super Admin access required')

        const { org_name, org_slug, exec_email, exec_password, enabled_modules } = await req.json()

        // Database client for direct TCP transaction
        const dbClient = new Client(Deno.env.get('DATABASE_URL'))
        await dbClient.connect()

        try {
            const v_new_uuid = crypto.randomUUID()

            // 1. Start TRANSACTION
            await dbClient.queryArray('BEGIN')

            // 2. Create Organization with Dual-ID Sync
            await dbClient.queryArray(
                'INSERT INTO public.orgs (id, org_id, name, slug, is_active, enabled_modules) VALUES ($1, $1, $2, $3, $4, $5)',
                [v_new_uuid, org_name, org_slug, true, JSON.stringify(enabled_modules || {
                    tasks: true,
                    messages: true,
                    payroll: true,
                    leaves: true,
                    performance: true,
                    hiring: true,
                    workforce: true,
                    announcements: true
                })]
            )
            const orgId = v_new_uuid

            // 3. Create Executive User (Auth API is the only part outside DB transaction)
            const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
                email: exec_email,
                password: exec_password,
                email_confirm: true,
                user_metadata: { org_id: orgId, role: 'executive' }
            })

            if (authError) throw authError

            // 4. Create Profile
            await dbClient.queryArray(
                'INSERT INTO public.profiles (id, org_id, email, role, full_name) VALUES ($1, $2, $3, $4, $5)',
                [authUser.user.id, orgId, exec_email, 'executive', 'Organization Executive']
            )

            // 5. COMMIT
            await dbClient.queryArray('COMMIT')

            return new Response(
                JSON.stringify({ success: true, org_id: orgId, user_id: authUser.user.id }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } catch (e) {
            // ROLLBACK on any failure
            await dbClient.queryArray('ROLLBACK')
            throw e
        } finally {
            await dbClient.end()
        }

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
