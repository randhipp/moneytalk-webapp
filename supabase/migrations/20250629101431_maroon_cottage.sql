/*
  # Add country and currency fields to user_profiles

  1. New Columns
    - `country` (text, optional) - User's country name
    - `currency` (text, default 'USD') - User's preferred currency code
    - `currency_symbol` (text, default '$') - Currency symbol for display
    - `setup_completed` (boolean, default false) - Whether user completed initial setup

  2. Updates
    - Set default values for existing users
    - Ensure all new users get proper defaults
*/

-- Add country column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN country text;
  END IF;
END $$;

-- Add currency column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'currency'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;

-- Add currency_symbol column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'currency_symbol'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN currency_symbol text DEFAULT '$';
  END IF;
END $$;

-- Add setup_completed column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'setup_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN setup_completed boolean DEFAULT false;
  END IF;
END $$;

-- Update existing users to have default currency settings and mark setup as completed
-- (since they were using the app before this feature was added)
UPDATE user_profiles 
SET 
  currency = COALESCE(currency, 'USD'),
  currency_symbol = COALESCE(currency_symbol, '$'),
  setup_completed = COALESCE(setup_completed, true)
WHERE currency IS NULL OR currency_symbol IS NULL OR setup_completed IS NULL;