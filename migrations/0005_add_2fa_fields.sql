-- Migration: Add Two-Factor Authentication fields
-- Description: Adds 2FA secret, backup codes, and enabled flag to users table

-- Add 2FA fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB DEFAULT '[]'::jsonb;

-- Add index for 2FA queries
CREATE INDEX IF NOT EXISTS idx_users_2fa_enabled ON users (two_factor_enabled);

-- Add comment for documentation
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_secret IS 'Encrypted TOTP secret for 2FA';
COMMENT ON COLUMN users.two_factor_backup_codes IS 'Array of one-time backup codes (hashed)';