import React, { useState } from 'react'
import { RefreshCw, Trash2, Database, AlertTriangle, CheckCircle, Sparkles, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Transaction } from './Dashboard'
import { subDays, subWeeks, format } from 'date-fns'

interface DataManagementProps {
  transactions: Transaction[]
  onDataRefresh: () => void
}

export function DataManagement({ transactions, onDataRefresh }: DataManagementProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  const handleRefreshDummyData = async () => {
    if (!user) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // First delete all existing transactions
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        throw deleteError
      }

      // Generate and insert new dummy data
      const dummyTransactions = generateDummyTransactions()
      
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(dummyTransactions)

      if (insertError) {
        throw insertError
      }

      setSuccess('Demo data refreshed successfully! New transactions have been generated.')
      onDataRefresh()
    } catch (error) {
      console.error('Error refreshing dummy data:', error)
      setError('Failed to refresh demo data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAllData = async () => {
    if (!user) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setSuccess('All transaction data deleted successfully!')
      setShowDeleteConfirm(false)
      onDataRefresh()
    } catch (error) {
      console.error('Error deleting data:', error)
      setError('Failed to delete data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalTransactions = transactions.length
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const oldestTransaction = transactions.length > 0 ? new Date(Math.min(...transactions.map(t => new Date(t.created_at).getTime()))) : null
  const newestTransaction = transactions.length > 0 ? new Date(Math.max(...transactions.map(t => new Date(t.created_at).getTime()))) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Data Management</h3>
      </div>

      {/* Data Overview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Data Overview</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Database className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Total Income</span>
            </div>
            <p className="text-2xl font-bold text-green-700">${totalIncome.toFixed(2)}</p>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-700">${totalExpenses.toFixed(2)}</p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Date Range</span>
            </div>
            <p className="text-sm font-bold text-blue-700">
              {oldestTransaction && newestTransaction ? (
                <>
                  {format(oldestTransaction, 'MMM dd')} - {format(newestTransaction, 'MMM dd')}
                </>
              ) : (
                'No data'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Refresh Demo Data */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Refresh Demo Data</h4>
            <p className="text-gray-600 mb-4">
              Generate fresh demo data with new transactions, spending patterns, and trends. This will replace all existing data with new realistic transactions from the last 5 weeks.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <h5 className="font-medium text-purple-900 mb-1">New demo data includes:</h5>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• 40+ new realistic transactions</li>
                <li>• Fresh spending patterns and trends</li>
                <li>• Updated weekend spending behaviors</li>
                <li>• New historical data for AI analysis</li>
              </ul>
            </div>
            <button
              onClick={handleRefreshDummyData}
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Demo Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete All Data */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Delete All Data</h4>
            <p className="text-gray-600 mb-4">
              Permanently delete all your transaction data. This action cannot be undone. Use this if you want to start completely fresh or remove all demo data.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center space-x-2 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All Data</span>
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h5 className="font-semibold text-red-900">Are you sure?</h5>
                </div>
                <p className="text-red-700 text-sm mb-4">
                  This will permanently delete all {totalTransactions} transactions. This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDeleteAllData}
                    disabled={loading}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" />
                        <span>Yes, Delete All</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use "Refresh Demo Data" to see how AI insights work with different spending patterns</li>
          <li>• Demo data helps you explore all features before adding your real transactions</li>
          <li>• Delete all data when you're ready to start tracking your actual finances</li>
          <li>• You can always regenerate demo data later if needed</li>
        </ul>
      </div>
    </div>
  )
}