import React, { useState } from 'react'
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, Crown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface OpenAIKeySetupProps {
  onKeySet: () => void
  onShowPricing: () => void
}

export function OpenAIKeySetup({ onKeySet, onShowPricing }: OpenAIKeySetupProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [testingKey, setTestingKey] = useState(false)
  const { user } = useAuth()

  const testApiKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !apiKey.trim()) return

    setLoading(true)
    setError('')
    setTestingKey(true)

    try {
      // Test the API key first
      const isValid = await testApiKey(apiKey.trim())
      setTestingKey(false)

      if (!isValid) {
        setError('Invalid OpenAI API key. Please check your key and try again.')
        setLoading(false)
        return
      }

      // Save the API key to the database
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ openai_api_key: apiKey.trim() })
        .eq('user_id', user.id)

      if (updateError) {
        throw updateError
      }

      onKeySet()
    } catch (error) {
      console.error('Error saving API key:', error)
      setError('Failed to save API key. Please try again.')
    } finally {
      setLoading(false)
      setTestingKey(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your AI Experience</h2>
            <p className="text-gray-600">
              To use AI-powered features, you can either upgrade to Pro or provide your own OpenAI API key.
            </p>
          </div>

          {/* Pro Option */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Crown className="w-6 h-6 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">MoneyTalk Pro</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">Recommended</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">$5.00</div>
                <div className="text-sm text-gray-600">/month</div>
              </div>
            </div>
            
            <ul className="text-sm text-gray-700 space-y-2 mb-4">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No need to manage OpenAI API keys</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Unlimited AI-powered voice recording</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Advanced AI insights and recommendations</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Priority support</span>
              </li>
            </ul>

            <button
              onClick={onShowPricing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or use your own OpenAI API key</span>
            </div>
          </div>

          {/* API Key Option */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bring Your Own API Key</h3>
              <p className="text-sm text-gray-600">
                Use your own OpenAI API key for AI features. You'll be charged directly by OpenAI based on usage.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">How to get your API key:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">OpenAI API Keys</a></li>
                <li>2. Sign in or create an account</li>
                <li>3. Click "Create new secret key"</li>
                <li>4. Copy and paste it below</li>
              </ol>
              <button
                onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                className="mt-3 flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open OpenAI API Keys</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    id="apiKey"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    placeholder="sk-..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {testingKey && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Testing API key...</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="w-full bg-gray-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save API Key</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Security Note</h4>
            <p className="text-sm text-gray-600">
              Your API key is stored securely and encrypted. It's only used for analyzing your transactions and is never shared with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}