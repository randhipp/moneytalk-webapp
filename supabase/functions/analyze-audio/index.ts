const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface AudioAnalysisRequest {
  audioData: string // Base64 encoded audio
  transcript?: string // Optional pre-existing transcript
  userId: string // User ID to fetch their API key
}

interface AudioAnalysisResponse {
  transcript: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
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
    const { audioData, transcript, userId }: AudioAnalysisRequest = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Check if user has Pro subscription and get appropriate API key
    const { openaiApiKey, isPro } = await getOpenAIApiKey(userId)
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not available. Please upgrade to Pro or add your own API key.')
    }

    let finalTranscript = transcript

    // If no transcript provided, use OpenAI to transcribe the audio
    if (!finalTranscript && audioData) {
      finalTranscript = await transcribeAudio(audioData, openaiApiKey)
    }

    if (!finalTranscript) {
      throw new Error('No transcript available and audio transcription failed')
    }

    // Use OpenAI to analyze the transcript for financial information
    const analysisResult = await analyzeTransactionWithAI(finalTranscript, openaiApiKey)

    const response: AudioAnalysisResponse = {
      transcript: finalTranscript,
      ...analysisResult
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error analyzing audio:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to analyze audio' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function getOpenAIApiKey(userId: string): Promise<{ openaiApiKey: string | null, isPro: boolean }> {
  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // First check if user has an active Pro subscription by filtering by user_id
    const subscriptionResponse = await fetch(`${supabaseUrl}/rest/v1/stripe_user_subscriptions?select=subscription_status&customer_id=in.(select customer_id from stripe_customers where user_id=eq.${userId})`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
    })

    let hasActivePro = false
    if (subscriptionResponse.ok) {
      const subscriptionData = await subscriptionResponse.json()
      hasActivePro = subscriptionData.length > 0 && subscriptionData[0]?.subscription_status === 'active'
    }

    if (hasActivePro) {
      // User has Pro subscription, use the server-side environment variable
      const proApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!proApiKey) {
        throw new Error('Server configuration error: OpenAI API key not configured for Pro users')
      }
      return { openaiApiKey: proApiKey, isPro: true }
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

      return { openaiApiKey: userApiKey, isPro: false }
    }

  } catch (error) {
    console.error('Error fetching OpenAI API key:', error)
    throw error
  }
}

async function transcribeAudio(audioData: string, openaiApiKey: string): Promise<string> {
  try {
    // Convert base64 to blob
    const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })

    // Create form data for OpenAI API
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const result = await response.json()
    return result.text || ''

  } catch (error) {
    console.error('Transcription error:', error)
    throw new Error(`Failed to transcribe audio: ${error.message}`)
  }
}

async function analyzeTransactionWithAI(transcript: string, openaiApiKey: string): Promise<Omit<AudioAnalysisResponse, 'transcript'>> {
  const systemPrompt = `You are a financial transaction analyzer. Analyze the given text and extract financial transaction information.

Categories available: Salary, Bills, Shopping, Groceries, Transport, Food, Drinks, Travel, Loans, Education, Kids, Family

Respond with a JSON object containing:
- type: "income" or "expense"
- category: one of the available categories
- amount: numeric value (extract from text, 0 if not found, sum all value if found more than 1)
- description: brief description of the transaction
- confidence: confidence score between 0 and 1

Examples:
"I spent $25 on groceries" -> {"type": "expense", "category": "Groceries", "amount": 25, "description": "Grocery shopping", "confidence": 0.9}
"Got paid $2000 salary" -> {"type": "income", "category": "Salary", "amount": 2000, "description": "Salary payment", "confidence": 0.95}
"Paid $50 for gas" -> {"type": "expense", "category": "Transport", "amount": 50, "description": "Gas payment", "confidence": 0.9}`

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
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this transaction: "${transcript}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
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

    // Parse the JSON response
    const analysis = JSON.parse(content)

    // Validate the response structure
    if (!analysis.type || !analysis.category || typeof analysis.amount !== 'number') {
      throw new Error('Invalid analysis response format')
    }

    return {
      type: analysis.type,
      category: analysis.category,
      amount: Math.abs(analysis.amount), // Ensure positive amount
      description: analysis.description || 'Transaction',
      confidence: analysis.confidence || 0.5
    }

  } catch (error) {
    console.error('AI analysis error:', error)
    
    // Fallback to simple keyword-based analysis if AI fails
    console.log('Falling back to keyword-based analysis')
    return analyzeTranscriptFallback(transcript)
  }
}

function analyzeTranscriptFallback(transcript: string): Omit<AudioAnalysisResponse, 'transcript'> {
  const text = transcript.toLowerCase()
  
  // Extract amount using regex
  const amountMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0

  // Determine type based on keywords
  const incomeKeywords = ['salary', 'income', 'paid', 'received', 'earned', 'bonus', 'refund']
  const expenseKeywords = ['spent', 'bought', 'paid for', 'cost', 'expense', 'bill']
  
  const isIncome = incomeKeywords.some(keyword => text.includes(keyword))
  const isExpense = expenseKeywords.some(keyword => text.includes(keyword)) || amount > 0
  
  const type: 'income' | 'expense' = isIncome ? 'income' : 'expense'

  // Categorize based on keywords
  const categories = {
    'Groceries': ['grocery', 'groceries', 'supermarket', 'food shopping', 'market'],
    'Food': ['restaurant', 'lunch', 'dinner', 'breakfast', 'cafe', 'food'],
    'Transport': ['gas', 'fuel', 'taxi', 'uber', 'bus', 'train', 'transport'],
    'Shopping': ['shopping', 'store', 'mall', 'online', 'amazon', 'clothes'],
    'Bills': ['bill', 'electricity', 'water', 'internet', 'phone', 'rent'],
    'Drinks': ['coffee', 'beer', 'wine', 'drinks', 'bar', 'alcohol'],
    'Travel': ['flight', 'hotel', 'vacation', 'trip', 'travel'],
    'Education': ['school', 'course', 'book', 'education', 'tuition'],
    'Family': ['family', 'kids', 'children', 'babysitter'],
    'Salary': ['salary', 'paycheck', 'wage', 'income'],
    'Loans': ['loan', 'mortgage', 'credit', 'debt']
  }

  let detectedCategory = 'Shopping' // default
  let confidence = 0.5

  for (const [category, keywords] of Object.entries(categories)) {
    const matches = keywords.filter(keyword => text.includes(keyword)).length
    if (matches > 0) {
      detectedCategory = category
      confidence = Math.min(0.9, 0.6 + (matches * 0.1))
      break
    }
  }

  // Generate description
  let description = transcript
  if (amount > 0) {
    description = description.replace(/\$?\d+(?:\.\d{2})?/, '').trim()
    if (!description) {
      description = `${detectedCategory} transaction`
    }
  }

  return {
    type,
    category: detectedCategory,
    amount,
    description: description || `${detectedCategory} transaction`,
    confidence
  }
}