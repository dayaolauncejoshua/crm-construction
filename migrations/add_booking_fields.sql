ALTER TABLE bookings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attendee_email VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attendee_name VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attendee_phone VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(255);

-- Update duration default from 30 to 60
ALTER TABLE bookings ALTER COLUMN duration SET DEFAULT 60;

-- Update existing rows to have scheduled_for same as scheduled_at
UPDATE bookings SET scheduled_for = scheduled_at WHERE scheduled_for IS NULL;