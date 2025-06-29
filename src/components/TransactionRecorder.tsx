import React, { useState, useRef } from 'react'
import { Mic, MicOff, Play, Square, Save, X, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Transaction } from './Dashboard'

interface TransactionRecorderProps {
  onTransactionAdded: (transaction: Transaction) => void
}

const CATEGORIES = [
  'Salary', 'Bills', 'Shopping', 'Groceries', 'Transport', 
  'Food', 'Drinks', 'Travel', 'Loans', 'Education', 'Kids', 'Family'
]

export function TransactionRecorder({ onTransactionAdded }: TransactionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [analysisResult, setAnalysisResult] = useState<{
    type: 'income' | 'expense'
    category: string
    amount: number
    description: string
    confidence: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { user } = useAuth()

  const startRecording = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)
        
        // Convert to base64 and analyze with OpenAI
        await analyzeAudioWithAI(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const analyzeAudioWithAI = async (audioBlob: Blob) => {
    setLoading(true)
    setError('')

    try {
      // Convert blob to base64 using FileReader
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Extract base64 data from data URL (remove "data:audio/wav;base64," prefix)
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      // Call the edge function with user ID
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-audio`
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          audioData: base64Audio,
          userId: user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze audio')
      }

      const result = await response.json()
      
      setTranscript(result.transcript)
      setAnalysisResult({
        type: result.type,
        category: result.category,
        amount: result.amount,
        description: result.description,
        confidence: result.confidence
      })

    } catch (error) {
      console.error('Error analyzing audio:', error)
      setError(`Analysis failed: ${error.message}. You can still add the transaction manually.`)
      
      // Fallback: show manual form
      setShowManualForm(true)
    } finally {
      setLoading(false)
    }
  }

  const saveTransaction = async () => {
    if (!user || !analysisResult) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            amount: analysisResult.amount,
            type: analysisResult.type,
            category: analysisResult.category,
            description: analysisResult.description,
            audio_transcript: transcript,
          }
        ])
        .select()
        .single()

      if (error) throw error

      onTransactionAdded(data)
      resetForm()
    } catch (error) {
      console.error('Error saving transaction:', error)
      setError('Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  const saveManualTransaction = async (formData: {
    amount: number
    type: 'income' | 'expense'
    category: string
    description: string
  }) => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            ...formData,
          }
        ])
        .select()
        .single()

      if (error) throw error

      onTransactionAdded(data)
      setShowManualForm(false)
      resetForm()
    } catch (error) {
      console.error('Error saving transaction:', error)
      setError('Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAudioURL(null)
    setTranscript('')
    setAnalysisResult(null)
    setLoading(false)
    setError('')
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Record Transaction</h3>
        <p className="text-gray-600">Record your transaction with voice or add manually</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!showManualForm ? (
        <div className="space-y-6">
          {/* Recording Controls */}
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-blue-500 hover:bg-blue-600'
              } disabled:opacity-50`}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
            <p className="text-sm text-gray-600">
              {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
            </p>
          </div>

          {/* Audio Playback */}
          {audioURL && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Recorded Audio</span>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <audio controls src={audioURL} className="w-full" />
            </div>
          )}

          {/* AI Analysis Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
                <div className="text-blue-600">
                  <div className="font-medium">AI is analyzing your transaction...</div>
                  <div className="text-sm">Converting speech to text and extracting details</div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && !loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-blue-900">AI Analysis Result</h4>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {Math.round(analysisResult.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
              
              {transcript && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="text-sm text-gray-600 mb-1">Transcript:</p>
                  <p className="italic text-gray-700">"{transcript}"</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className={`font-medium capitalize ${
                    analysisResult.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analysisResult.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium text-gray-900">${analysisResult.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900">{analysisResult.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="font-medium text-gray-900">{analysisResult.description}</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={saveTransaction}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Transaction</span>
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Record Again
                </button>
              </div>
            </div>
          )}

          {/* Manual Entry Option */}
          <div className="text-center">
            <button
              onClick={() => setShowManualForm(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Or add transaction manually
            </button>
          </div>
        </div>
      ) : (
        <ManualTransactionForm
          onSave={saveManualTransaction}
          onCancel={() => {
            setShowManualForm(false)
            setError('')
          }}
          loading={loading}
        />
      )}
    </div>
  )
}

interface ManualTransactionFormProps {
  onSave: (data: {
    amount: number
    type: 'income' | 'expense'
    category: string
    description: string
  }) => void
  onCancel: () => void
  loading: boolean
}

function ManualTransactionForm({ onSave, onCancel, loading }: ManualTransactionFormProps) {
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      amount: parseFloat(amount),
      type,
      category,
      description,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Add Transaction Manually</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount ($)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as 'income' | 'expense')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Transaction description"
          required
        />
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Transaction</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}