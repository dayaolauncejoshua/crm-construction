-- Add Google OAuth fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS oauth_provider TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add index for Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);

-- Add comment for documentation
COMMENT ON COLUMN users.google_id IS 'Google OAuth unique identifier';
COMMENT ON COLUMN users.oauth_provider IS 'OAuth provider (google, facebook, etc)';
COMMENT ON COLUMN users.profile_image_url IS 'Profile picture URL from OAuth provider';