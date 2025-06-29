import React, { useState, useEffect } from 'react'
import { TransactionRecorder } from './TransactionRecorder'
import { TransactionList } from './TransactionList'
import { FinancialReports } from './FinancialReports'
import { ExportData } from './ExportData'
import { AIInsights } from './AIInsights'
import { OpenAIKeySetup } from './OpenAIKeySetup'
import { DummyDataGenerator } from './DummyDataGenerator'
import { DataManagement } from './DataManagement'
import { BudgetLimitsManager } from './BudgetLimitsManager'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Mic, List, BarChart3, Download, Brain, Plus, RefreshCw, Settings } from 'lucide-react'

export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  audio_transcript?: string
  created_at: string
  updated_at: string
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('record')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
  const [checkingApiKey, setCheckingApiKey] = useState(true)
  const [showDummyDataGenerator, setShowDummyDataGenerator] = useState(false)
  const [budgetLimitsVersion, setBudgetLimitsVersion] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      checkOpenAIKey()
    }
  }, [user])

  useEffect(() => {
    if (hasOpenAIKey) {
      fetchTransactions()
    }
  }, [hasOpenAIKey, user])

  const checkOpenAIKey = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('openai_api_key')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error checking API key:', error)
        setHasOpenAIKey(false)
      } else {
        setHasOpenAIKey(!!data?.openai_api_key)
      }
    } catch (error) {
      console.error('Error checking API key:', error)
      setHasOpenAIKey(false)
    } finally {
      setCheckingApiKey(false)
    }
  }

  const fetchTransactions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setTransactions(data || [])
      
      // If user has no transactions, show dummy data generator
      if (!data || data.length === 0) {
        setShowDummyDataGenerator(true)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev])
  }

  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev =>
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    )
  }

  const deleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId))
  }

  const handleApiKeySet = () => {
    setHasOpenAIKey(true)
  }

  const handleDummyDataGenerated = () => {
    setShowDummyDataGenerator(false)
    fetchTransactions() // Refresh transactions
  }

  const handleSkipDummyData = () => {
    setShowDummyDataGenerator(false)
    setLoading(false)
  }

  const handleDataRefresh = () => {
    fetchTransactions()
  }

  const handleBudgetLimitsUpdated = () => {
    setBudgetLimitsVersion(prev => prev + 1)
  }

  const tabs = [
    { id: 'record', label: 'Record', icon: Mic },
    { id: 'transactions', label: 'Transactions', icon: List },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'budget', label: 'Budget Limits', icon: Settings },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'manage', label: 'Manage Data', icon: RefreshCw },
  ]

  if (checkingApiKey) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your setup...</p>
        </div>
      </div>
    )
  }

  if (!hasOpenAIKey) {
    return <OpenAIKeySetup onKeySet={handleApiKeySet} />
  }

  if (showDummyDataGenerator) {
    return (
      <DummyDataGenerator
        onDataGenerated={handleDummyDataGenerated}
        onSkip={handleSkipDummyData}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
        <p className="text-blue-100">Track your finances with AI-powered insights</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                ${transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month Income</p>
              <p className="text-2xl font-bold text-green-600">
                ${transactions
                  .filter(t => t.type === 'income' && new Date(t.created_at).getMonth() === new Date().getMonth())
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                ${transactions
                  .filter(t => t.type === 'expense' && new Date(t.created_at).getMonth() === new Date().getMonth())
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'record' && (
            <TransactionRecorder onTransactionAdded={addTransaction} />
          )}
          {activeTab === 'transactions' && (
            <TransactionList
              transactions={transactions}
              onTransactionUpdated={updateTransaction}
              onTransactionDeleted={deleteTransaction}
            />
          )}
          {activeTab === 'reports' && (
            <FinancialReports transactions={transactions} />
          )}
          {activeTab === 'insights' && (
            <AIInsights 
              transactions={transactions} 
              budgetLimitsVersion={budgetLimitsVersion}
            />
          )}
          {activeTab === 'budget' && (
            <BudgetLimitsManager onLimitsUpdated={handleBudgetLimitsUpdated} />
          )}
          {activeTab === 'export' && (
            <ExportData transactions={transactions} />
          )}
          {activeTab === 'manage' && (
            <DataManagement 
              transactions={transactions} 
              onDataRefresh={handleDataRefresh}
            />
          )}
        </div>
      </div>
    </div>
  )
}