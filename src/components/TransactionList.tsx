import React, { useState } from 'react'
import { Edit2, Trash2, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Transaction } from './Dashboard'

interface TransactionListProps {
  transactions: Transaction[]
  onTransactionUpdated: (transaction: Transaction) => void
  onTransactionDeleted: (transactionId: string) => void
}

const CATEGORIES = [
  'Salary', 'Bills', 'Shopping', 'Groceries', 'Transport', 
  'Food', 'Drinks', 'Travel', 'Loans', 'Education', 'Kids', 'Family'
]

export function TransactionList({ transactions, onTransactionUpdated, onTransactionDeleted }: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    amount: string
    type: 'income' | 'expense'
    category: string
    description: string
  }>({
    amount: '',
    type: 'expense',
    category: '',
    description: ''
  })
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setEditForm({
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      description: transaction.description
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({
      amount: '',
      type: 'expense',
      category: '',
      description: ''
    })
  }

  const saveEdit = async (transactionId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(editForm.amount),
          type: editForm.type,
          category: editForm.category,
          description: editForm.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select()
        .single()

      if (error) throw error

      onTransactionUpdated(data)
      cancelEdit()
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('Failed to update transaction')
    }
  }

  const deleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (error) throw error

      onTransactionDeleted(transactionId)
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Failed to delete transaction')
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (filter !== 'all' && transaction.type !== filter) return false
    if (categoryFilter !== 'all' && transaction.category !== categoryFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h3>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="typeFilter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'income' | 'expense')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="bg-gray-50 rounded-lg p-4">
              {editingId === transaction.id ? (
                // Edit Form
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="Amount"
                    />
                  </div>
                  <div>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="Description"
                    />
                  </div>
                  <div className="md:col-span-4 flex space-x-2">
                    <button
                      onClick={() => saveEdit(transaction.id)}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Display Mode
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className={`text-lg font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">{transaction.type}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.category}</p>
                      <p className="text-sm text-gray-500">Category</p>
                    </div>
                    <div>
                      <p className="text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">Description</p>
                    </div>
                    <div>
                      <p className="text-gray-900">{format(new Date(transaction.created_at), 'MMM dd, yyyy')}</p>
                      <p className="text-sm text-gray-500">{format(new Date(transaction.created_at), 'HH:mm')}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => startEdit(transaction)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {transaction.audio_transcript && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Transcript:</span> "{transaction.audio_transcript}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}