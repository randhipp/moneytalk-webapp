import React, { useState, useEffect } from 'react'
import { Crown, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface SubscriptionData {
  subscription_status: string
  price_id: string | null
  current_period_end: number | null
  cancel_at_period_end: boolean
}

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchSubscription()
    }
  }, [user])

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status, price_id, current_period_end, cancel_at_period_end')
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

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span className="text-sm">Loading subscription...</span>
      </div>
    )
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Free Plan</span>
      </div>
    )
  }

  const getStatusInfo = () => {
    switch (subscription.subscription_status) {
      case 'active':
        return {
          icon: <Crown className="w-4 h-4 text-yellow-500" />,
          text: 'MoneyTalk Pro',
          color: 'text-green-600'
        }
      case 'trialing':
        return {
          icon: <Clock className="w-4 h-4 text-blue-500" />,
          text: 'Trial Active',
          color: 'text-blue-600'
        }
      case 'past_due':
        return {
          icon: <AlertCircle className="w-4 h-4 text-orange-500" />,
          text: 'Payment Due',
          color: 'text-orange-600'
        }
      case 'canceled':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'Canceled',
          color: 'text-red-600'
        }
      default:
        return {
          icon: <AlertCircle className="w-4 h-4 text-gray-500" />,
          text: subscription.subscription_status,
          color: 'text-gray-600'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className={`flex items-center space-x-2 ${statusInfo.color}`}>
      {statusInfo.icon}
      <span className="text-sm font-medium">{statusInfo.text}</span>
      {subscription.cancel_at_period_end && (
        <span className="text-xs text-gray-500">(Ends at period)</span>
      )}
    </div>
  )
}