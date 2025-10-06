-- Add unread count to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Add last read timestamp
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP;