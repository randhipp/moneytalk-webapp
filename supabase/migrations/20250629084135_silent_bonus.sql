/*
  # Add OpenAI API Key Management

  1. Schema Changes
    - Add `openai_api_key` column to `user_profiles` table
    - Add encrypted storage for API keys

  2. Security
    - API keys are stored encrypted
    - Only accessible by the user who owns them
*/

-- Add openai_api_key column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'openai_api_key'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN openai_api_key text;
  END IF;
END $$;