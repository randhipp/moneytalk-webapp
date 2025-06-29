/*
  # Create budget_limits table

  1. New Tables
    - `budget_limits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `category` (text, not null)
      - `monthly_limit` (numeric, not null)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `budget_limits` table
    - Add policy for authenticated users to manage their own budget limits

  3. Constraints
    - Unique constraint on user_id + category combination
    - Check constraint to ensure positive limit amounts
*/

CREATE TABLE IF NOT EXISTS budget_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  monthly_limit numeric(10,2) NOT NULL CHECK (monthly_limit > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own budget limits
CREATE POLICY "Users can read own budget limits"
  ON budget_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for users to insert their own budget limits
CREATE POLICY "Users can insert own budget limits"
  ON budget_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own budget limits
CREATE POLICY "Users can update own budget limits"
  ON budget_limits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own budget limits
CREATE POLICY "Users can delete own budget limits"
  ON budget_limits
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_budget_limits_updated_at
  BEFORE UPDATE ON budget_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();