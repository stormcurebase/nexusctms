/*
  # Google Calendar Integration Schema

  1. New Tables
    - `calendar_tokens`
      - `id` (uuid, primary key) - Unique identifier for token record
      - `user_id` (text) - User identifier for per-user token storage
      - `access_token` (text) - Encrypted Google OAuth access token
      - `refresh_token` (text) - Encrypted Google OAuth refresh token
      - `token_expiry` (timestamptz) - When the access token expires
      - `google_email` (text) - Connected Google account email
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `calendar_event_mappings`
      - `id` (uuid, primary key) - Unique identifier for mapping
      - `user_id` (text) - User who owns this mapping
      - `ctms_visit_id` (text) - CTMS visit ID reference
      - `google_event_id` (text) - Google Calendar event ID
      - `study_id` (text) - Associated study identifier
      - `patient_id` (text) - Associated patient identifier
      - `last_synced` (timestamptz) - Last successful sync timestamp
      - `sync_direction` (text) - Direction of sync: 'ctms_to_google' or 'google_to_ctms'
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `calendar_sync_log`
      - `id` (uuid, primary key) - Unique identifier for log entry
      - `user_id` (text) - User who performed the action
      - `action` (text) - Action performed: 'fetch', 'create', 'update', 'delete', 'oauth'
      - `status` (text) - Status: 'success', 'error', 'pending'
      - `error_message` (text, nullable) - Error details if status is 'error'
      - `event_id` (text, nullable) - Related event ID if applicable
      - `timestamp` (timestamptz) - When the action occurred

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own calendar data
    - Prevent cross-user data access
    - Ensure users can only read/write their own tokens and mappings

  3. Indexes
    - Add indexes on user_id for all tables for efficient queries
    - Add index on google_event_id for quick lookups
    - Add index on ctms_visit_id for reverse mapping
*/

-- Create calendar_tokens table
CREATE TABLE IF NOT EXISTS calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  google_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create calendar_event_mappings table
CREATE TABLE IF NOT EXISTS calendar_event_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  ctms_visit_id text NOT NULL,
  google_event_id text NOT NULL,
  study_id text,
  patient_id text,
  last_synced timestamptz DEFAULT now(),
  sync_direction text DEFAULT 'ctms_to_google',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create calendar_sync_log table
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  event_id text,
  timestamp timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_tokens
CREATE POLICY "Users can view own calendar tokens"
  ON calendar_tokens FOR SELECT
  TO authenticated
  USING (user_id = current_user);

CREATE POLICY "Users can insert own calendar tokens"
  ON calendar_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_user);

CREATE POLICY "Users can update own calendar tokens"
  ON calendar_tokens FOR UPDATE
  TO authenticated
  USING (user_id = current_user)
  WITH CHECK (user_id = current_user);

CREATE POLICY "Users can delete own calendar tokens"
  ON calendar_tokens FOR DELETE
  TO authenticated
  USING (user_id = current_user);

-- Policies for calendar_event_mappings
CREATE POLICY "Users can view own event mappings"
  ON calendar_event_mappings FOR SELECT
  TO authenticated
  USING (user_id = current_user);

CREATE POLICY "Users can insert own event mappings"
  ON calendar_event_mappings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_user);

CREATE POLICY "Users can update own event mappings"
  ON calendar_event_mappings FOR UPDATE
  TO authenticated
  USING (user_id = current_user)
  WITH CHECK (user_id = current_user);

CREATE POLICY "Users can delete own event mappings"
  ON calendar_event_mappings FOR DELETE
  TO authenticated
  USING (user_id = current_user);

-- Policies for calendar_sync_log
CREATE POLICY "Users can view own sync logs"
  ON calendar_sync_log FOR SELECT
  TO authenticated
  USING (user_id = current_user);

CREATE POLICY "Users can insert own sync logs"
  ON calendar_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_user);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_user_id ON calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_event_mappings_user_id ON calendar_event_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_event_mappings_google_event_id ON calendar_event_mappings(google_event_id);
CREATE INDEX IF NOT EXISTS idx_event_mappings_ctms_visit_id ON calendar_event_mappings(ctms_visit_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user_id ON calendar_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON calendar_sync_log(timestamp DESC);