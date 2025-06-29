/*
  # Add country and currency support

  1. New Columns
    - Add `country` and `currency` to user_profiles table
    - Add `currency_symbol` for display purposes
    - Add `setup_completed` to track if user has completed initial setup

  2. Security
    - Existing RLS policies will cover new columns
*/

-- Add country and currency columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN country text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'currency'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'currency_symbol'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN currency_symbol text DEFAULT '$';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'setup_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN setup_completed boolean DEFAULT false;
  END IF;
END $$;