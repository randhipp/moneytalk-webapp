import React, { useMemo, useState, useEffect } from 'react'
import { Transaction } from './Dashboard'
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Lightbulb, RefreshCw, Sparkles, Crown } from 'lucide-react'
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface AIInsightsProps {
  transactions: Transaction[]
  budgetLimitsVersion?: number
  isPro?: boolean
}

interface CachedAIRecommendations {
  data: AIRecommendation[]
  timestamp: number
}

interface BudgetLimit {
  category: string
  monthly_limit: number
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

export function AIInsights({ transactions, budgetLimitsVersion = 0, isPro = false }: AIInsightsProps) {
  const [basicInsights, setBasicInsights] = useState({
    spendingTrends: [],
    recommendations: [],
    budgetAlerts: [],
    patterns: []
  })
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])
  const [cachedAIRecommendations, setCachedAIRecommendations] = useState<CachedAIRecommendations | null>(null)
  const [isRefreshingAI, setIsRefreshingAI] = useState(false)
  const [lastAIRefresh, setLastAIRefresh] = useState<Date | null>(null)
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([])
  const [aiRecommendationsError, setAiRecommendationsError] = useState('')
  const { user } = useAuth()

  // Load budget limits
  useEffect(() => {
    if (user) {
      loadBudgetLimits()
    }
  }, [user, budgetLimitsVersion])

  const loadBudgetLimits = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('budget_limits')
        .select('category, monthly_limit')
        .eq('user_id', user.id)

      if (error) throw error

      setBudgetLimits(data || [])
    } catch (error) {
      console.error('Error loading budget limits:', error)
      setBudgetLimits([])
    }
  }

  // Generate basic insights whenever transactions or budget limits change
  useEffect(() => {
    const insights = generateBasicInsights(transactions, budgetLimits)
    setBasicInsights(insights)
  }, [transactions, budgetLimits])

  // Load cached AI recommendations on component mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ai-recommendations-cache')
      if (stored) {
        const parsedCache: CachedAIRecommendations = JSON.parse(stored)
        const now = Date.now()
        const cacheValidDuration = 7 * 24 * 60 * 60 * 1000 // 1 week

        // Only check time-based expiration, not data changes
        if ((now - parsedCache.timestamp) < cacheValidDuration) {
          setCachedAIRecommendations(parsedCache)
          setAiRecommendations(parsedCache.data)
          setLastAIRefresh(new Date(parsedCache.timestamp))
        } else {
          // Cache is expired, clear it but don't auto-generate
          setCachedAIRecommendations(null)
          setAiRecommendations([])
          setLastAIRefresh(null)
          localStorage.removeItem('ai-recommendations-cache')
        }
      }
    } catch (error) {
      console.warn('Failed to load cached AI recommendations:', error)
    }
  }, []) // Only run on component mount, not when data changes

  const generateAIRecommendations = async () => {
    if (transactions.length === 0) return

    setIsRefreshingAI(true)
    setAiRecommendationsError('')

    try {
      const recommendations = await fetchAIRecommendations(transactions, budgetLimits)
      
      const now = Date.now()
      const newCachedRecommendations: CachedAIRecommendations = {
        data: recommendations,
        timestamp: now
      }

      // Update states
      setCachedAIRecommendations(newCachedRecommendations)
      setAiRecommendations(recommendations)
      setLastAIRefresh(new Date())

      // Store in localStorage for persistence
      try {
        localStorage.setItem('ai-recommendations-cache', JSON.stringify(newCachedRecommendations))
      } catch (error) {
        console.warn('Failed to cache AI recommendations in localStorage:', error)
      }

    } catch (error) {
      console.error('Error generating AI recommendations:', error)
      setAiRecommendationsError('Failed to generate AI recommendations. Please try refreshing manually.')
    } finally {
      setIsRefreshingAI(false)
    }
  }

  const handleManualRefresh = async () => {
    // Clear cache to force regeneration
    localStorage.removeItem('ai-recommendations-cache')
    setCachedAIRecommendations(null)
    
    // Generate new recommendations
    await generateAIRecommendations()
  }

  const fetchAIRecommendations = async (transactions: Transaction[], budgetLimits: BudgetLimit[]): Promise<AIRecommendation[]> => {
    if (!user) throw new Error('User not authenticated')

    // Use the edge function which will handle Pro vs non-Pro logic
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`
    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    }

    // Prepare transaction summary for AI
    const transactionSummary = prepareTransactionSummary(transactions, budgetLimits)
    
    // Get economic trends (simplified - in production you'd use a real economic API)
    const economicContext = await getEconomicContext()

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          transactionSummary,
          economicContext,
          isPro
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate AI recommendations')
      }

      const result = await response.json()
      return result.recommendations || []

    } catch (error) {
      console.error('AI recommendation generation failed:', error)
      throw error
    }
  }

  const prepareTransactionSummary = (transactions: Transaction[], budgetLimits: BudgetLimit[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Current month transactions
    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.created_at)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    // Previous month transactions
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevMonthTransactions = transactions.filter(t => {
      const date = new Date(t.created_at)
      return date.getMonth() === prevMonth && date.getFullYear() === prevYear
    })

    // Calculate totals
    const currentIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const currentExpenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    const prevIncome = prevMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const prevExpenses = prevMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

    // Category breakdown
    const categorySpending = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)

    // Budget analysis
    const budgetAnalysis = budgetLimits.map(limit => {
      const spent = categorySpending[limit.category] || 0
      const utilization = (spent / limit.monthly_limit) * 100
      return {
        category: limit.category,
        budgeted: limit.monthly_limit,
        spent,
        utilization: Math.round(utilization),
        status: utilization > 100 ? 'over' : utilization > 80 ? 'warning' : 'good'
      }
    })

    return `
CURRENT MONTH (${format(now, 'MMMM yyyy')}):
- Income: $${currentIncome.toFixed(2)}
- Expenses: $${currentExpenses.toFixed(2)}
- Net: $${(currentIncome - currentExpenses).toFixed(2)}
- Savings Rate: ${currentIncome > 0 ? (((currentIncome - currentExpenses) / currentIncome) * 100).toFixed(1) : 0}%

PREVIOUS MONTH COMPARISON:
- Income Change: ${prevIncome > 0 ? (((currentIncome - prevIncome) / prevIncome) * 100).toFixed(1) : 'N/A'}%
- Expense Change: ${prevExpenses > 0 ? (((currentExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1) : 'N/A'}%

SPENDING BY CATEGORY:
${Object.entries(categorySpending)
  .sort(([,a], [,b]) => b - a)
  .map(([category, amount]) => `- ${category}: $${amount.toFixed(2)}`)
  .join('\n')}

BUDGET PERFORMANCE:
${budgetAnalysis.map(b => 
  `- ${b.category}: $${b.spent.toFixed(2)}/$${b.budgeted.toFixed(2)} (${b.utilization}% used) - ${b.status.toUpperCase()}`
).join('\n')}

TRANSACTION COUNT: ${transactions.length} total transactions
AVERAGE TRANSACTION: $${transactions.length > 0 ? (transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length).toFixed(2) : '0.00'}
`
  }

  const getEconomicContext = async () => {
    // In a production app, you'd fetch real economic data from APIs like:
    // - Federal Reserve Economic Data (FRED)
    // - Bureau of Labor Statistics
    // - Financial news APIs
    
    // For now, we'll provide current general economic context
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    
    return `
CURRENT ECONOMIC ENVIRONMENT (${currentYear}):

INFLATION & INTEREST RATES:
- Federal Reserve continues to monitor inflation trends
- Interest rates remain elevated compared to 2020-2021 lows
- Impact: Higher borrowing costs, better savings account yields

EMPLOYMENT MARKET:
- Labor market remains relatively strong
- Wage growth continues but at moderated pace
- Impact: Job security generally good, but wage increases may not keep pace with inflation

CONSUMER SPENDING TRENDS:
- Shift toward experiences over goods continues
- Increased focus on value and essential purchases
- Impact: Discretionary spending under pressure

FINANCIAL RECOMMENDATIONS CONTEXT:
- Emergency funds more critical due to economic uncertainty
- High-yield savings accounts offering better returns
- Credit card debt more expensive due to higher rates
- Real estate market showing signs of cooling
- Stock market volatility requires diversified approach

KEY CONSIDERATIONS:
- Build emergency fund (3-6 months expenses)
- Pay down high-interest debt aggressively
- Take advantage of higher savings rates
- Review and optimize recurring subscriptions
- Consider inflation impact on fixed expenses
`
  }

  const isCacheValid = () => {
    if (!cachedAIRecommendations) return false
    const now = Date.now()
    const cacheValidDuration = 7 * 24 * 60 * 60 * 1000 // 1 week
    return (now - cachedAIRecommendations.timestamp) < cacheValidDuration
  }

  const getCacheTimeRemaining = () => {
    if (!cachedAIRecommendations) return null
    const now = Date.now()
    const cacheValidDuration = 7 * 24 * 60 * 60 * 1000 // 1 week
    const timeRemaining = cacheValidDuration - (now - cachedAIRecommendations.timestamp)
    
    if (timeRemaining <= 0) return null
    
    const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60 * 1000))
    const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    
    if (daysRemaining > 0) {
      return `${daysRemaining}d ${hoursRemaining}h`
    }
    return `${hoursRemaining}h`
  }

  // Combine basic insights with AI recommendations
  const displayedInsights = {
    ...basicInsights,
    recommendations: aiRecommendations
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">AI Financial Insights</h3>
          {isPro && (
            <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
              <Crown className="w-3 h-3" />
              <span>Pro</span>
            </div>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Add some transactions to get AI-powered insights about your spending patterns and recommendations.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Budget Alerts */}
          {displayedInsights.budgetAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h4 className="text-lg font-semibold text-red-900">Budget Alerts</h4>
              </div>
              <div className="space-y-3">
                {displayedInsights.budgetAlerts.map((alert, index) => (
                  <div key={index} className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{alert.category}</p>
                        <p className="text-sm text-gray-600">
                          Spent ${alert.spent.toFixed(2)} of ${alert.budget.toFixed(2)} budget
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-600 font-semibold">
                          +${alert.overBudget.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">Over budget</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Spending Trends */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h4 className="text-lg font-semibold text-gray-900">Spending Trends</h4>
              <span className="text-sm text-gray-500">(Last Week vs Same Week Last Month)</span>
            </div>
            {displayedInsights.spendingTrends.length > 0 ? (
              <div className="space-y-4">
                {displayedInsights.spendingTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{trend.category}</p>
                        {trend.isNew && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">New</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Last week: ${trend.amount.toFixed(2)}
                        {trend.lastMonthAmount > 0 && (
                          <span className="text-gray-500"> | Same week last month: ${trend.lastMonthAmount.toFixed(2)}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {trend.trend === 'increasing' ? (
                        <>
                          <span className="text-red-600 text-sm font-medium">
                            +{trend.percentage.toFixed(1)}%
                          </span>
                          <TrendingUp className="w-4 h-4 text-red-600" />
                        </>
                      ) : trend.trend === 'decreasing' ? (
                        <>
                          <span className="text-green-600 text-sm font-medium">
                            -{trend.percentage.toFixed(1)}%
                          </span>
                          <TrendingDown className="w-4 h-4 text-green-600" />
                        </>
                      ) : (
                        <span className="text-gray-500 text-sm">Stable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Not enough historical data for trend analysis. Add more transactions over time to see spending trends.
              </p>
            )}
          </div>

          {/* Enhanced AI Recommendations */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h4 className="text-lg font-semibold text-purple-900">AI-Powered Recommendations</h4>
              </div>
              <div className="flex items-center space-x-4">
                {/* Cache Status */}
                <div className="text-right">
                  {lastAIRefresh && (
                    <p className="text-xs text-gray-500">
                      Last updated: {format(lastAIRefresh, 'MMM dd, HH:mm')}
                    </p>
                  )}
                  {isCacheValid() && getCacheTimeRemaining() && (
                    <p className="text-xs text-green-600">
                      Cache expires in {getCacheTimeRemaining()}
                    </p>
                  )}
                </div>
                
                {/* Manual Refresh Button */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshingAI}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Generate AI recommendations"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingAI ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">
                    {isRefreshingAI ? 'Analyzing...' : aiRecommendations.length > 0 ? 'Refresh' : 'Generate AI Insights'}
                  </span>
                </button>
              </div>
            </div>

            {/* Cache Info Banner */}
            {isCacheValid() && !isRefreshingAI && aiRecommendations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Cached AI recommendations</span> - Analysis is cached for 1 week to improve performance. 
                    {getCacheTimeRemaining() && (
                      <span> Expires in {getCacheTimeRemaining()}.</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {isRefreshingAI && (
              <div className="flex items-center space-x-2 text-purple-600 mb-4">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing with AI...</span>
              </div>
            )}

            {aiRecommendationsError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm">{aiRecommendationsError}</p>
              </div>
            )}

            <div className="space-y-4">
              {displayedInsights.recommendations.map((rec, index) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h5 className="font-semibold text-gray-900">{rec.title}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rec.impact === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : rec.impact === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {rec.impact} impact
                        </span>
                        {rec.confidence && (
                          <span className="text-xs text-gray-500">
                            {Math.round(rec.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{rec.description}</p>
                      
                      {rec.actionItems && rec.actionItems.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-sm font-medium text-gray-900 mb-2">Action Steps:</h6>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {rec.actionItems.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-start space-x-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rec.economicContext && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <h6 className="text-sm font-medium text-blue-900 mb-1">Economic Context:</h6>
                          <p className="text-sm text-blue-800">{rec.economicContext}</p>
                        </div>
                      )}

                      <div className="flex items-center space-x-4">
                        {rec.savings && rec.savings > 0 && (
                          <span className="text-green-600 font-medium text-sm">
                            Potential savings: ${rec.savings.toFixed(2)}/month
                          </span>
                        )}
                      </div>
                    </div>
                    <Lightbulb className="w-5 h-5 text-yellow-500 mt-1 ml-4" />
                  </div>
                </div>
              ))}
            </div>

            {!isRefreshingAI && displayedInsights.recommendations.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-3">Click "Generate AI Insights" to get personalized financial recommendations powered by AI.</p>
                <p className="text-xs text-gray-400">AI analysis includes spending patterns, budget optimization, and economic trend insights.</p>
              </div>
            )}
          </div>

          {/* Spending Patterns */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-2 mb-4">
              <Brain className="w-5 h-5 text-purple-600" />
              <h4 className="text-lg font-semibold text-gray-900">Spending Patterns</h4>
            </div>
            <div className="space-y-4">
              {displayedInsights.patterns.map((pattern, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-2">{pattern.title}</h5>
                  <p className="text-gray-600 text-sm mb-2">{pattern.description}</p>
                  <p className="text-blue-600 text-sm font-medium">{pattern.insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <p className="text-gray-700">Set up automatic savings transfers to reach your 20% savings goal</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <p className="text-gray-700">Review and optimize your highest spending categories</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <p className="text-gray-700">Monitor weekly spending trends to identify patterns early</p>
              </div>
              {displayedInsights.spendingTrends.some(t => t.trend === 'increasing') && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">Address increasing spending trends before they become habits</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Extract the basic insights generation logic into a separate function
function generateBasicInsights(transactions: Transaction[], budgetLimits: BudgetLimit[]) {
  if (transactions.length === 0) {
    return {
      spendingTrends: [],
      recommendations: [],
      budgetAlerts: [],
      patterns: []
    }
  }

  // Calculate spending by category
  const categorySpending = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  // Calculate monthly averages
  const monthlyData = transactions.reduce((acc, t) => {
    const month = new Date(t.created_at).toISOString().slice(0, 7)
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0 }
    }
    if (t.type === 'income') {
      acc[month].income += t.amount
    } else {
      acc[month].expenses += t.amount
    }
    return acc
  }, {} as Record<string, { income: number; expenses: number }>)

  // Calculate historical spending trends (last week vs same week from last month)
  const now = new Date()
  const lastWeekStart = startOfWeek(subWeeks(now, 1))
  const lastWeekEnd = endOfWeek(subWeeks(now, 1))
  const sameWeekLastMonthStart = startOfWeek(subWeeks(now, 5)) // 5 weeks ago (approximately same week last month)
  const sameWeekLastMonthEnd = endOfWeek(subWeeks(now, 5))

  // Get transactions for last week
  const lastWeekTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.created_at)
    return t.type === 'expense' && isWithinInterval(transactionDate, {
      start: lastWeekStart,
      end: lastWeekEnd
    })
  })

  // Get transactions for same week last month
  const sameWeekLastMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.created_at)
    return t.type === 'expense' && isWithinInterval(transactionDate, {
      start: sameWeekLastMonthStart,
      end: sameWeekLastMonthEnd
    })
  })

  // Calculate category spending for both periods
  const lastWeekCategorySpending = lastWeekTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)

  const sameWeekLastMonthCategorySpending = sameWeekLastMonthTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)

  // Generate spending trends with actual historical comparison
  const allCategories = new Set([
    ...Object.keys(lastWeekCategorySpending),
    ...Object.keys(sameWeekLastMonthCategorySpending)
  ])

  const spendingTrends = Array.from(allCategories)
    .map(category => {
      const lastWeekAmount = lastWeekCategorySpending[category] || 0
      const lastMonthAmount = sameWeekLastMonthCategorySpending[category] || 0
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
      let percentage = 0

      if (lastMonthAmount > 0) {
        percentage = ((lastWeekAmount - lastMonthAmount) / lastMonthAmount) * 100
        if (percentage > 5) {
          trend = 'increasing'
        } else if (percentage < -5) {
          trend = 'decreasing'
        }
      } else if (lastWeekAmount > 0) {
        trend = 'increasing'
        percentage = 100 // New spending category
      }

      return {
        category,
        amount: lastWeekAmount,
        lastMonthAmount,
        trend,
        percentage: Math.abs(percentage),
        isNew: lastMonthAmount === 0 && lastWeekAmount > 0
      }
    })
    .filter(trend => trend.amount > 0) // Only show categories with spending
    .sort((a, b) => b.amount - a.amount) // Sort by current spending amount
    .slice(0, 5) // Top 5 categories

  // Budget alerts using user-defined limits
  const budgetAlerts = []
  Object.entries(categorySpending).forEach(([category, amount]) => {
    const budgetLimit = budgetLimits.find(b => b.category === category)
    
    if (budgetLimit && amount > budgetLimit.monthly_limit) {
      budgetAlerts.push({
        category,
        spent: amount,
        budget: budgetLimit.monthly_limit,
        overBudget: amount - budgetLimit.monthly_limit
      })
    }
  })

  // Enhanced spending patterns with historical data
  const patterns = []
  
  // Weekend vs weekday spending pattern
  const weekendSpending = transactions
    .filter(t => {
      const date = new Date(t.created_at)
      const dayOfWeek = date.getDay()
      return t.type === 'expense' && (dayOfWeek === 0 || dayOfWeek === 6)
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const weekdaySpending = transactions
    .filter(t => {
      const date = new Date(t.created_at)
      const dayOfWeek = date.getDay()
      return t.type === 'expense' && dayOfWeek >= 1 && dayOfWeek <= 5
    })
    .reduce((sum, t) => sum + t.amount, 0)

  if (weekendSpending > 0 && weekdaySpending > 0) {
    const weekendPercentage = (weekendSpending / (weekendSpending + weekdaySpending)) * 100
    if (weekendPercentage > 35) {
      patterns.push({
        type: 'weekend_spending',
        title: 'High Weekend Spending Pattern',
        description: `${weekendPercentage.toFixed(1)}% of your spending occurs on weekends, which is above the typical 28% average.`,
        insight: 'Consider planning weekend activities that align with your budget to reduce impulse spending.'
      })
    }
  }

  // Historical comparison pattern
  if (spendingTrends.length > 0) {
    const totalLastWeek = spendingTrends.reduce((sum, t) => sum + t.amount, 0)
    const totalSameWeekLastMonth = spendingTrends.reduce((sum, t) => sum + t.lastMonthAmount, 0)
    
    if (totalSameWeekLastMonth > 0) {
      const overallChange = ((totalLastWeek - totalSameWeekLastMonth) / totalSameWeekLastMonth) * 100
      
      patterns.push({
        type: 'historical_comparison',
        title: 'Weekly Spending Comparison',
        description: `Last week's spending was ${Math.abs(overallChange).toFixed(1)}% ${overallChange > 0 ? 'higher' : 'lower'} than the same week last month (${format(sameWeekLastMonthStart, 'MMM dd')} - ${format(sameWeekLastMonthEnd, 'MMM dd')}).`,
        insight: overallChange > 10 
          ? 'Consider reviewing what drove the increase in spending last week.'
          : overallChange < -10 
          ? 'Great job reducing your spending compared to last month!'
          : 'Your spending patterns are relatively consistent week-to-week.'
      })
    }
  }

  return {
    spendingTrends,
    recommendations: [], // AI recommendations will be handled separately
    budgetAlerts,
    patterns
  }
}