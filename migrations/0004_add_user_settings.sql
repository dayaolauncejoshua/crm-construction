-- Migration: Add settings column to users table
-- Description: Adds JSONB field to store user preferences and notification settings

-- Add settings column with default empty object
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING gin (settings);

-- Update existing users with default settings structure
UPDATE users 
SET settings = '{
  "notifications": {
    "email": true,
    "whatsapp": true,
    "leads": true,
    "bookings": true,
    "weeklyReports": false
  },
  "regional": {
    "timezone": "UTC",
    "language": "en"
  }
}'::jsonb
WHERE settings IS NULL OR settings = '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.settings IS 'User preferences including notifications, regional settings, and other customizations stored as JSONB';