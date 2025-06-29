import React, { useState } from 'react'
import { Database, Sparkles, CheckCircle, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { subDays, subWeeks, format } from 'date-fns'

interface DummyDataGeneratorProps {
  onDataGenerated: () => void
  onSkip: () => void
}

export function DummyDataGenerator({ onDataGenerated, onSkip }: DummyDataGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  const generateDummyTransactions = () => {
    const now = new Date()
    const transactions = []

    // Categories and their typical amounts
    const expenseCategories = [
      { category: 'Groceries', amounts: [45, 67, 89, 123, 156, 78, 92] },
      { category: 'Food', amounts: [25, 35, 18, 42, 28, 55, 33] },
      { category: 'Transport', amounts: [15, 45, 60, 25, 35, 50, 40] },
      { category: 'Shopping', amounts: [85, 120, 200, 75, 95, 150, 180] },
      { category: 'Bills', amounts: [120, 85, 200, 150, 95, 110, 175] },
      { category: 'Drinks', amounts: [12, 8, 15, 22, 18, 25, 14] },
      { category: 'Travel', amounts: [250, 180, 320, 150, 280, 200] },
      { category: 'Education', amounts: [45, 89, 125, 67, 95] },
      { category: 'Family', amounts: [75, 120, 95, 150, 85] }
    ]

    const incomeCategories = [
      { category: 'Salary', amounts: [2500, 2500, 2500] },
      { category: 'Bills', amounts: [150, 200, 100] } // Refunds, etc.
    ]

    const descriptions = {
      'Groceries': ['Weekly grocery shopping', 'Supermarket run', 'Fresh produce', 'Household essentials', 'Organic groceries'],
      'Food': ['Lunch at cafe', 'Dinner with friends', 'Coffee and pastry', 'Pizza delivery', 'Restaurant meal'],
      'Transport': ['Gas fill-up', 'Uber ride', 'Bus pass', 'Parking fee', 'Taxi to airport'],
      'Shopping': ['New clothes', 'Online purchase', 'Electronics', 'Home decor', 'Gift for friend'],
      'Bills': ['Internet bill', 'Phone bill', 'Electricity', 'Water bill', 'Insurance payment'],
      'Drinks': ['Coffee shop', 'Happy hour', 'Wine for dinner', 'Energy drink', 'Smoothie'],
      'Travel': ['Flight booking', 'Hotel stay', 'Car rental', 'Travel insurance', 'Vacation expenses'],
      'Education': ['Online course', 'Book purchase', 'Workshop fee', 'Certification exam'],
      'Family': ['Kids activities', 'Family dinner', 'Babysitter', 'School supplies', 'Family outing'],
      'Salary': ['Monthly salary', 'Bi-weekly paycheck', 'Salary deposit'],
    }

    // Generate transactions for the last 5 weeks (to have comparison data)
    for (let week = 0; week < 5; week++) {
      const weekStart = subWeeks(now, week)
      
      // Generate 8-15 transactions per week
      const transactionsThisWeek = Math.floor(Math.random() * 8) + 8
      
      for (let i = 0; i < transactionsThisWeek; i++) {
        // Random day within the week
        const transactionDate = subDays(weekStart, Math.floor(Math.random() * 7))
        
        // 85% chance of expense, 15% chance of income
        const isExpense = Math.random() < 0.85
        const categories = isExpense ? expenseCategories : incomeCategories
        const randomCategory = categories[Math.floor(Math.random() * categories.length)]
        const randomAmount = randomCategory.amounts[Math.floor(Math.random() * randomCategory.amounts.length)]
        const randomDescription = descriptions[randomCategory.category][Math.floor(Math.random() * descriptions[randomCategory.category].length)]
        
        // Add some variation to amounts
        const variation = (Math.random() - 0.5) * 0.3 // ±15% variation
        const finalAmount = Math.round(randomAmount * (1 + variation) * 100) / 100
        
        transactions.push({
          user_id: user!.id,
          amount: finalAmount,
          type: isExpense ? 'expense' : 'income',
          category: randomCategory.category,
          description: randomDescription,
          created_at: transactionDate.toISOString(),
          updated_at: transactionDate.toISOString()
        })
      }
    }

    // Add some weekend-heavy spending patterns
    const weekendTransactions = [
      { category: 'Food', amount: 65, description: 'Weekend brunch', type: 'expense' },
      { category: 'Drinks', amount: 45, description: 'Saturday night out', type: 'expense' },
      { category: 'Shopping', amount: 120, description: 'Weekend shopping spree', type: 'expense' },
      { category: 'Travel', amount: 200, description: 'Weekend getaway', type: 'expense' }
    ]

    // Add weekend transactions for the last 3 weekends
    for (let weekend = 0; weekend < 3; weekend++) {
      const saturday = subDays(now, (weekend * 7) + (now.getDay() === 0 ? 1 : now.getDay() + 1))
      const sunday = subDays(saturday, -1)
      
      weekendTransactions.forEach(transaction => {
        const isOnSaturday = Math.random() < 0.6
        const transactionDate = isOnSaturday ? saturday : sunday
        
        transactions.push({
          user_id: user!.id,
          amount: transaction.amount + (Math.random() - 0.5) * 20,
          type: transaction.type as 'income' | 'expense',
          category: transaction.category,
          description: transaction.description,
          created_at: transactionDate.toISOString(),
          updated_at: transactionDate.toISOString()
        })
      })
    }

    return transactions
  }

  const handleGenerateData = async () => {
    if (!user) return

    setGenerating(true)
    setError('')

    try {
      const dummyTransactions = generateDummyTransactions()
      
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(dummyTransactions)

      if (insertError) {
        throw insertError
      }

      onDataGenerated()
    } catch (error) {
      console.error('Error generating dummy data:', error)
      setError('Failed to generate demo data. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to MoneyTalk!</h2>
            <p className="text-gray-600">
              Let's set up some demo data so you can explore the AI insights feature right away.
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <Database className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">Demo Data Includes:</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• 40+ realistic transactions from the last 5 weeks</li>
                  <li>• Various categories: groceries, food, transport, shopping, etc.</li>
                  <li>• Income and expense patterns</li>
                  <li>• Weekend spending trends</li>
                  <li>• Historical data for AI trend analysis</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">What you'll see:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm text-blue-800">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Spending trends</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>AI recommendations</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Budget insights</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Spending patterns</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleGenerateData}
              disabled={generating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating Demo Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Demo Data</span>
                </>
              )}
            </button>

            <button
              onClick={onSkip}
              disabled={generating}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Skip and Start Fresh</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              You can always delete this demo data later and add your own real transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}