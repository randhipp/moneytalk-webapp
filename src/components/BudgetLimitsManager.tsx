import React, { useState, useEffect } from 'react'
import { Settings, Save, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface BudgetLimit {
  id?: string
  category: string
  monthly_limit: number
}

interface BudgetLimitsManagerProps {
  onLimitsUpdated: () => void
}

const DEFAULT_CATEGORIES = [
  'Food', 'Shopping', 'Transport', 'Drinks', 'Groceries', 
  'Bills', 'Travel', 'Education', 'Family', 'Loans'
]

export function BudgetLimitsManager({ onLimitsUpdated }: BudgetLimitsManagerProps) {
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadBudgetLimits()
    }
  }, [user])

  const loadBudgetLimits = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('budget_limits')
        .select('*')
        .eq('user_id', user.id)
        .order('category')

      if (error) throw error

      setBudgetLimits(data || [])
    } catch (error) {
      console.error('Error loading budget limits:', error)
      setError('Failed to load budget limits')
    } finally {
      setLoading(false)
    }
  }

  const saveBudgetLimits = async () => {
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Delete existing limits
      const { error: deleteError } = await supabase
        .from('budget_limits')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      // Insert new limits
      if (budgetLimits.length > 0) {
        const limitsToInsert = budgetLimits.map(limit => ({
          user_id: user.id,
          category: limit.category,
          monthly_limit: limit.monthly_limit
        }))

        const { error: insertError } = await supabase
          .from('budget_limits')
          .insert(limitsToInsert)

        if (insertError) throw insertError
      }

      setSuccess('Budget limits saved successfully!')
      onLimitsUpdated()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving budget limits:', error)
      setError('Failed to save budget limits')
    } finally {
      setSaving(false)
    }
  }

  const addBudgetLimit = () => {
    if (!newCategory || !newLimit || parseFloat(newLimit) <= 0) {
      setError('Please enter a valid category and limit amount')
      return
    }

    // Check if category already exists
    if (budgetLimits.some(limit => limit.category.toLowerCase() === newCategory.toLowerCase())) {
      setError('Budget limit for this category already exists')
      return
    }

    setBudgetLimits(prev => [...prev, {
      category: newCategory,
      monthly_limit: parseFloat(newLimit)
    }])

    setNewCategory('')
    setNewLimit('')
    setError('')
  }

  const updateBudgetLimit = (index: number, field: 'category' | 'monthly_limit', value: string | number) => {
    setBudgetLimits(prev => prev.map((limit, i) => 
      i === index ? { ...limit, [field]: value } : limit
    ))
  }

  const removeBudgetLimit = (index: number) => {
    setBudgetLimits(prev => prev.filter((_, i) => i !== index))
  }

  const addPresetCategory = (category: string) => {
    if (budgetLimits.some(limit => limit.category === category)) return

    setBudgetLimits(prev => [...prev, {
      category,
      monthly_limit: 0
    }])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-orange-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Budget Limits</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Customize Your Budget Alerts</h4>
            <p className="text-sm text-blue-700 mt-1">
              Set spending limits for different categories. You'll receive alerts in the AI Insights when you exceed these limits.
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

      {/* Current Budget Limits */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Budget Limits</h4>
        
        {budgetLimits.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No budget limits set. Add some categories below to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {budgetLimits.map((limit, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <input
                    type="text"
                    value={limit.category}
                    onChange={(e) => updateBudgetLimit(index, 'category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Category name"
                  />
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={limit.monthly_limit}
                      onChange={(e) => updateBudgetLimit(index, 'monthly_limit', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeBudgetLimit(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Remove budget limit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Budget Limit */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Budget Limit</h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Limit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <button
            onClick={addBudgetLimit}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Budget Limit</span>
          </button>
        </div>

        {/* Quick Add Preset Categories */}
        <div className="mt-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Quick Add Categories:</h5>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_CATEGORIES
              .filter(category => !budgetLimits.some(limit => limit.category === category))
              .map(category => (
                <button
                  key={category}
                  onClick={() => addPresetCategory(category)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  + {category}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveBudgetLimits}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Budget Limits</span>
            </>
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Set realistic monthly limits based on your income and financial goals</li>
          <li>• Review and adjust your limits regularly as your spending habits change</li>
          <li>• Budget alerts will appear in the AI Insights tab when you exceed these limits</li>
          <li>• Consider the 50/30/20 rule: 50% needs, 30% wants, 20% savings</li>
        </ul>
      </div>
    </div>
  )
}