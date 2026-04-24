import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, orgName } = await req.json()
        const resendApiKey = Deno.env.get('RESEND_API_KEY')

        if (!resendApiKey) throw new Error('Missing RESEND_API_KEY')

        const emailHtml = `
            <div style="font-family: 'Playfair Display', serif; background-color: #F8F7F4; padding: 60px 20px; color: #1f2937;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 48px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); text-align: center;">
                    <div style="margin-bottom: 40px;">
                        <span style="font-family: serif; font-size: 28px; font-weight: bold; color: #1f2937;">Talent</span><span style="font-family: sans-serif; font-size: 28px; font-weight: bold; color: #3b82f6;">Ops</span>
                    </div>
                    <h1 style="font-size: 32px; font-weight: 700; margin-bottom: 24px; color: #111827; letter-spacing: -0.02em;">Setup Request Received</h1>
                    <p style="font-size: 16px; line-height: 1.8; color: #4b5563; margin-bottom: 40px; text-align: left;">
                        Hi there, <br/><br/>
                        Thank you for choosing TalentOps. We have successfully received your setup request for <b>${orgName}</b>. Our team is currently reviewing your configuration to ensure everything is optimized for your workforce intelligence journey.
                    </p>
                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px; margin-bottom: 40px; text-align: left;">
                        <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 600; margin-bottom: 8px;">What's next?</p>
                        <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">You will receive another notification as soon as your professional workspace has been provisioned and is ready for access. This usually takes less than 24 hours.</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #f3f4f6; margin-bottom: 40px;" />
                    <p style="font-size: 12px; color: #9ca3af; text-align: center; letter-spacing: 0.05em; text-transform: uppercase;">
                        &copy; 2026 TalentOps Inc. &bull; Enterprise Workforce Intelligence
                    </p>
                </div>
            </div>
        `;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'TalentOps <onboarding@resend.dev>',
                to: [email],
                subject: `Request Received: ${orgName}`,
                html: emailHtml,
            }),
        })

        const data = await res.json()

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
