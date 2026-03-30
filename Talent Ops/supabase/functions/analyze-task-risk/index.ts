import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { metrics, taskTitle, employeeContext } = await req.json()

        if (!metrics) {
            throw new Error('Metrics are required for analysis')
        }

        // 1. Get Secret Key
        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            throw new Error('Missing OPENAI_API_KEY')
        }

        // 2. Prepare Prompt - Persona: High-Performance Productivity Coach
        const isMilestone = !!employeeContext?.milestone_triggered;
        const milestoneStr = isMilestone ? `\n        URGENT CONTEXT: This analysis was explicitly requested because the employee hit a critical task milestone: ${employeeContext.milestone_triggered}.
        Your coaching must specifically address hitting this exact milestone. Give them strict but encouraging advice for exactly this stage of the task.` : '';

        const systemPrompt = `You are a High-Performance Productivity Coach for a fast-paced environment.
        Your goal is to keep the employee on track using urgent, human, and encouraging language.
        ${milestoneStr}
        
        Analyze the metrics and provide an assessment.
        IMPORTANT: If this is a 'Micro-task', be extremely sensitive to time. Use phrases like "Time is running out", "The deadline is seconds away", or "We need to move faster".
        Avoid technical jargon like "allocated hours" or "predicted delay" in the 'reasons'. Speak to the human effort.

        Return strictly valid JSON only:
        {
          "risk_level": "low" | "medium" | "high",
          "confidence": 0-100,
          "reasons": ["Human-centric reason 1", "Human-centric reason 2"],
          "recommended_actions": ["Actionable step 1", "Actionable step 2"]
        }
        
        Metrics:
        - Task Title: "${taskTitle}"
        - Allocated Time: ${metrics.allocated_hours * 60} minutes
        - Time Already Spent: ${Math.round(metrics.elapsed_hours * 60)} minutes
        - Completion: ${Math.round((metrics.progress_ratio || 0) * 100)}%
        - Expected Completion by now: ${Math.round((metrics.expected_progress || 0) * 100)}%
        - Current Velocity: ${metrics.velocity} points/hour
        - Threat Level: ${metrics.risk_level || metrics.base_risk_level}
        - Is Micro-task: ${!!employeeContext?.is_micro_task}
        `

        // 3. Call OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Task: "${taskTitle}". Context: ${JSON.stringify(employeeContext || {})}` }
                ],
                temperature: 0.3,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenAI API Error: ${errorText}`)
        }

        const data = await response.json()
        let analysis = null
        try {
            const content = data.choices[0].message.content
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            analysis = JSON.parse(cleanContent)
        } catch (e) {
            console.error('Failed to parse AI response:', e)
            analysis = {
                risk_level: metrics.base_risk_level || 'low',
                confidence: 50,
                reasons: ['AI response could not be parsed.'],
                recommended_actions: ['Review progress manually.']
            }
        }

        return new Response(JSON.stringify(analysis), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
