/*
  # Add API Usage Tracking Table

  1. New Tables
    - `api_usage_logs`
      - `id` (uuid, primary key)
      - `api_name` (text) - Name of the API (coingecko, newsapi, alphavantage, etc.)
      - `endpoint` (text) - Specific endpoint called
      - `calls_count` (integer) - Number of calls made
      - `success` (boolean) - Whether the call was successful
      - `response_time_ms` (integer) - Response time in milliseconds
      - `error_message` (text, nullable) - Error message if failed
      - `called_at` (timestamptz) - When the API was called
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `api_usage_logs` table
    - Add policy for public read access (monitoring dashboard)

  3. Notes
    - This table tracks API usage to ensure we stay within free tier limits
    - Helps monitor API health and response times
    - Enables rate limiting logic
*/

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL,
  endpoint text NOT NULL,
  calls_count integer DEFAULT 1,
  success boolean DEFAULT true,
  response_time_ms integer,
  error_message text,
  called_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view API usage logs"
  ON api_usage_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_name ON api_usage_logs(api_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_called_at ON api_usage_logs(called_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_success ON api_usage_logs(success);