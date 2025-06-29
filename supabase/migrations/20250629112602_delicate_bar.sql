/*
  # Add AI recommendations cache table

  1. New Tables
    - `ai_recommendations_cache`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `recommendations` (jsonb, cached AI recommendations)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `ai_recommendations_cache` table
    - Add policy for authenticated users to manage their own cache

  3. Constraints
    - Unique constraint on user_id (one cache per user)
*/

CREATE TABLE IF NOT EXISTS ai_recommendations_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendations jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE ai_recommendations_cache ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own cache
CREATE POLICY "Users can read own AI cache"
  ON ai_recommendations_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for users to insert their own cache
CREATE POLICY "Users can insert own AI cache"
  ON ai_recommendations_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own cache
CREATE POLICY "Users can update own AI cache"
  ON ai_recommendations_cache
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own cache
CREATE POLICY "Users can delete own AI cache"
  ON ai_recommendations_cache
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at column
CREATE TRIGGER update_ai_recommendations_cache_updated_at
  BEFORE UPDATE ON ai_recommendations_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();