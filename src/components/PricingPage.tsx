import React, { useState } from 'react'
import { Check, Crown, Loader } from 'lucide-react'
import { products } from '../stripe-config'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface PricingPageProps {
  onClose?: () => void
}

export function PricingPage({ onClose }: PricingPageProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { user } = useAuth()

  const handleSubscribe = async (priceId: string, mode: 'payment' | 'subscription') => {
    if (!user) return

    setLoading(priceId)
    setError('')

    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceId,
          mode,
          success_url: `${window.location.origin}/success`,
          cancel_url: window.location.href,
        },
      })

      if (error) {
        throw error
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      setError(error.message || 'Failed to start checkout process')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Upgrade to MoneyTalk Pro for enhanced features
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Plan</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                $0
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">Perfect for getting started</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Basic transaction recording</span>
              </li>
              <li className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Manual transaction entry</span>
              </li>
              <li className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Basic reports and charts</span>
              </li>
              <li className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Data export</span>
              </li>
              <li className="flex items-center space-x-3 opacity-50">
                <span className="w-5 h-5 text-gray-400">✗</span>
                <span className="text-gray-500">Voice recording with AI analysis</span>
              </li>
              <li className="flex items-center space-x-3 opacity-50">
                <span className="w-5 h-5 text-gray-400">✗</span>
                <span className="text-gray-500">AI-powered insights</span>
              </li>
              <li className="flex items-center space-x-3 opacity-50">
                <span className="w-5 h-5 text-gray-400">✗</span>
                <span className="text-gray-500">Requires OpenAI API key</span>
              </li>
            </ul>

            <button
              disabled
              className="w-full py-3 px-4 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-1">
                  <Crown className="w-4 h-4" />
                  <span>Most Popular</span>
                </div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $5.00
                  <span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">Full AI-powered experience</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Everything in Free Plan</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Voice recording with AI analysis</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">AI-powered spending insights</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Smart categorization</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Budget alerts and recommendations</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 font-medium">{product.description}</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(product.priceId, product.mode)}
                disabled={loading === product.priceId}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading === product.priceId ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Upgrade to Pro</span>
                )}
              </button>
            </div>
          ))}
        </div>

        {onClose && (
          <div className="text-center mt-8">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Continue with Free Plan
            </button>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            All plans include secure data storage and 24/7 support
          </p>
        </div>
      </div>
    </div>
  )
}