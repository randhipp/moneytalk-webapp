import { createClient } from '@supabase/supabase-js'

// Use placeholder values that won't cause errors if env vars are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description: string
          audio_transcript?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: 'income' | 'expense'
          category?: string
          description?: string
          audio_transcript?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          created_at: string
          updated_at: string
          openai_api_key?: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          created_at?: string
          updated_at?: string
          openai_api_key?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          created_at?: string
          updated_at?: string
          openai_api_key?: string
        }
      }
      budget_limits: {
        Row: {
          id: string
          user_id: string
          category: string
          monthly_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          monthly_limit: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          monthly_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}