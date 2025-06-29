const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface AIInsightsRequest {
  userId: string
  transactionSummary: string
  economicContext: string
}

interface AIRecommendation {
  type: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  savings?: number
  actionItems?: string[]
  economicContext?: string
  confidence: number
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const { userId, transactionSummary, economicContext }: AIInsightsRequest = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Get appropriate OpenAI API key
    const { openaiApiKey } = await getOpenAIApiKey(userId)
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not available. Please upgrade to Pro or add your own API key.')
    }

    // Generate AI recommendations
    const recommendations = await generateAIRecommendations(transactionSummary, economicContext, openaiApiKey)

    return new Response(
      JSON.stringify({ recommendations }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error generating AI insights:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate AI insights' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function getOpenAIApiKey(userId: string): Promise<{ openaiApiKey: string | null }> {
  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // First check if user has an active Pro subscription
    const subscriptionResponse = await fetch(`${supabaseUrl}/rest/v1/stripe_customers?select=customer_id&user_id=eq.${userId}`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
    })

    let hasActivePro = false
    if (subscriptionResponse.ok) {
      const customerData = await subscriptionResponse.json()
      
      if (customerData.length > 0) {
        const customerId = customerData[0].customer_id
        
        // Check subscription status for this customer
        const subResponse = await fetch(`${supabaseUrl}/rest/v1/stripe_subscriptions?select=status&customer_id=eq.${customerId}&deleted_at=is.null`, {
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
          },
        })
        
        if (subResponse.ok) {
          const subData = await subResponse.json()
          hasActivePro = subData.length > 0 && subData[0]?.status === 'active'
        }
      }
    }

    if (hasActivePro) {
      // User has Pro subscription, use the server-side environment variable
      const proApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!proApiKey) {
        throw new Error('Server configuration error: OpenAI API key not configured for Pro users')
      }
      return { openaiApiKey: proApiKey }
    } else {
      // User doesn't have Pro subscription, get their personal API key
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}&select=openai_api_key`, {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile')
      }

      const profileData = await profileResponse.json()
      const userApiKey = profileData[0]?.openai_api_key || null

      return { openaiApiKey: userApiKey }
    }

  } catch (error) {
    console.error('Error fetching OpenAI API key:', error)
    throw error
  }
}

async function generateAIRecommendations(transactionSummary: string, economicContext: string, openaiApiKey: string): Promise<AIRecommendation[]> {
  const systemPrompt = `You are an expert financial advisor with deep knowledge of personal finance, economic trends, and behavioral economics. Analyze the provided financial data and generate personalized recommendations.

Consider:
1. Current spending patterns and trends
2. Budget adherence and overspending areas
3. Economic context and future trends
4. Behavioral finance principles
5. Risk management and emergency planning
6. Investment and savings optimization

Respond with a JSON array of recommendation objects, each containing:
- type: category of recommendation
- title: clear, actionable title
- description: detailed explanation with specific insights
- impact: "high", "medium", or "low"
- savings: estimated monthly savings potential (number)
- actionItems: array of 2-3 specific action steps
- economicContext: how current economic trends affect this recommendation
- confidence: confidence score 0-1

Focus on:
- Actionable, specific advice
- Economic trend integration
- Behavioral insights
- Risk mitigation
- Long-term financial health

Maximum 5 recommendations, prioritize by impact and relevance.`

  const userPrompt = `Analyze my financial data and provide personalized recommendations:

TRANSACTION SUMMARY:
${transactionSummary}

ECONOMIC CONTEXT:
${economicContext}

Please provide detailed, actionable financial recommendations based on this data, current economic trends, and best practices for personal finance management.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const result = await response.json()
    const content = result.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Strip markdown code block delimiters if present
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Parse the JSON response
    const recommendations = JSON.parse(cleanContent)
    
    // Validate and format recommendations
    return recommendations.map((rec: any) => ({
      type: rec.type || 'general',
      title: rec.title || 'Financial Recommendation',
      description: rec.description || '',
      impact: rec.impact || 'medium',
      savings: rec.savings || 0,
      actionItems: rec.actionItems || [],
      economicContext: rec.economicContext || '',
      confidence: rec.confidence || 0.8
    }))

  } catch (error) {
    console.error('AI recommendation generation failed:', error)
    throw error
  }
}