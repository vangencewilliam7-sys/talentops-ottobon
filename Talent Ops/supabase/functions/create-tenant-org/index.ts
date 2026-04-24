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

        // 1. Get the Onboarding Request ID
        const { onboarding_request_id } = await req.json()
        if (!onboarding_request_id) throw new Error('Missing onboarding_request_id')

        // 2. Fetch configuration data from onboarding_requests table
        const { data: requestData, error: requestError } = await supabaseClient
            .from('onboarding_requests')
            .select('*')
            .eq('id', onboarding_request_id)
            .single()

        if (requestError || !requestData) {
            console.error('Error fetching onboarding request:', requestError)
            throw new Error('Onboarding request not found or invalid')
        }

        if (requestData.status === 'approved') {
            throw new Error('This request has already been approved and provisioned.')
        }

        const { 
            org_name, 
            org_slug, 
            admin_email, 
            selected_modules 
        } = requestData

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
                [v_new_uuid, org_name, org_slug, true, JSON.stringify(selected_modules || {})]
            )
            const orgId = v_new_uuid

            // 3. Invite Executive User (Secure Invitation Flow)
            // This replaces the old auth.admin.createUser method
            const { data: authUser, error: authInviteError } = await supabaseClient.auth.admin.inviteUserByEmail(
                admin_email,
                { 
                    data: { 
                        org_id: orgId, 
                        role: 'executive',
                        full_name: 'Organization Executive' 
                    } 
                }
            )

            if (authInviteError) {
                console.error('Auth Invitation Error:', authInviteError)
                throw authInviteError
            }

            // 4. Create Profile (Linked to the invited ID)
            await dbClient.queryArray(
                'INSERT INTO public.profiles (id, org_id, email, role, full_name) VALUES ($1, $2, $3, $4, $5)',
                [authUser.user.id, orgId, admin_email, 'executive', 'Organization Executive']
            )

            // 5. Update Onboarding Request status to 'approved'
            await dbClient.queryArray(
                'UPDATE public.onboarding_requests SET status = $1, approved_at = NOW() WHERE id = $2',
                ['approved', onboarding_request_id]
            )

            // 6. COMMIT
            await dbClient.queryArray('COMMIT')

            // 7. Send Branded "Workspace Ready" Email via Resend
            try {
                const resendApiKey = Deno.env.get('RESEND_API_KEY');
                if (resendApiKey) {
                    const emailHtml = `
                        <div style="font-family: 'Playfair Display', serif; background-color: #F8F7F4; padding: 60px 20px; color: #1f2937;">
                            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 48px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); text-align: center;">
                                <div style="margin-bottom: 40px;">
                                    <span style="font-family: serif; font-size: 28px; font-weight: bold; color: #1f2937;">Talent</span><span style="font-family: sans-serif; font-size: 28px; font-weight: bold; color: #3b82f6;">Ops</span>
                                </div>
                                <h1 style="font-size: 32px; font-weight: 700; margin-bottom: 24px; color: #111827; letter-spacing: -0.02em;">Workspace is Ready</h1>
                                <p style="font-size: 16px; line-height: 1.8; color: #4b5563; margin-bottom: 40px; text-align: left;">
                                    Hi there, <br/><br/>
                                    Great news! Your workforce intelligence platform for <b>${org_name}</b> has been successfully provisioned. You can now access your professional workspace using the credentials below.
                                </p>
                                <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px; margin-bottom: 40px; text-align: left;">
                                    <p style="margin: 0; font-size: 14px; color: #6b7280; margin-bottom: 4px;">Your Workspace URL:</p>
                                    <p style="margin: 0; font-size: 18px; color: #111827; font-weight: bold;">${org_slug}.talentops.ai</p>
                                </div>
                                <a href="https://talentops.ai/login" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 18px 36px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; margin-bottom: 40px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);">Access Your Workspace</a>
                                <hr style="border: none; border-top: 1px solid #f3f4f6; margin-bottom: 40px;" />
                                <p style="font-size: 12px; color: #9ca3af; text-align: center; letter-spacing: 0.05em; text-transform: uppercase;">
                                    &copy; 2026 TalentOps Inc. &bull; Enterprise Workforce Intelligence
                                </p>
                            </div>
                        </div>
                    `;

                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${resendApiKey}`,
                        },
                        body: JSON.stringify({
                            from: 'TalentOps <onboarding@resend.dev>',
                            to: [admin_email],
                            subject: `Workspace Ready: ${org_name}`,
                            html: emailHtml,
                        }),
                    });
                    console.log(`[Email Sent] Approval notice sent to ${admin_email}`);
                }
            } catch (emailError) {
                console.error('[Email Failed] Failed to send approval notice:', emailError.message);
                // We don't throw here to avoid failing the whole provisioning if just the email fails
            }

            console.log(`[Provisioning Success] Org: ${org_name}, Request: ${onboarding_request_id}`)

            return new Response(
                JSON.stringify({ 
                    success: true, 
                    org_id: orgId, 
                    user_id: authUser.user.id,
                    message: `Organization provisioned and invitation sent to ${admin_email}`
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } catch (e) {
            // ROLLBACK on any failure
            console.error('[Provisioning Failed] Rolling back transaction. Error:', e.message)
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

