import React, { useEffect, useState } from 'react'
import { CheckCircle, ArrowRight, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function SuccessPage() {
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Wait a moment for webhook to process, then fetch subscription
      const timer = setTimeout(() => {
        fetchSubscription()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [user])

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status, price_id')
        .maybeSingle()

      if (error) {
        console.error('Error fetching subscription:', error)
        return
      }

      setSubscription(data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>

          {loading ? (
            <div className="mb-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Activating your subscription...</p>
            </div>
          ) : subscription && subscription.subscription_status === 'active' ? (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <span className="text-lg font-semibold text-gray-900">MoneyTalk Pro Activated!</span>
              </div>
              <p className="text-gray-600">
                You now have access to all premium features including AI-powered voice recording and insights.
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-gray-600">
                Thank you for your purchase! Your account is being set up.
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Start recording transactions with your voice</li>
              <li>• Get AI-powered spending insights</li>
              <li>• Set up budget limits and alerts</li>
              <li>• Explore advanced financial reports</li>
            </ul>
          </div>

          <Link
            to="/"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-xs text-gray-500 mt-4">
            You'll receive a confirmation email shortly with your receipt.
          </p>
        </div>
      </div>
    </div>
  )
}