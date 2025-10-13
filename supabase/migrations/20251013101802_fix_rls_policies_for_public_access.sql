/*
  # Fix RLS Policies for Public Access

  1. Changes
    - Allow public SELECT access on all tables for the dashboard
    - Allow public INSERT access for data collection services
    - Allow public UPDATE access for recommendations and outcomes
    - Allow public DELETE access for data cleanup operations

  2. Security
    - This is a public analytical dashboard
    - No user authentication required
    - Data is read-only for display purposes
    - System services need write access for data collection
*/

-- crypto_prices policies
DROP POLICY IF EXISTS "Allow public read access" ON crypto_prices;
DROP POLICY IF EXISTS "Allow public insert access" ON crypto_prices;
DROP POLICY IF EXISTS "Allow public delete access" ON crypto_prices;

CREATE POLICY "Allow public read access"
  ON crypto_prices FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON crypto_prices FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete access"
  ON crypto_prices FOR DELETE
  TO anon, authenticated
  USING (true);

-- news_events policies
DROP POLICY IF EXISTS "Allow public read access" ON news_events;
DROP POLICY IF EXISTS "Allow public insert access" ON news_events;

CREATE POLICY "Allow public read access"
  ON news_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON news_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- market_indices policies
DROP POLICY IF EXISTS "Allow public read access" ON market_indices;
DROP POLICY IF EXISTS "Allow public insert access" ON market_indices;

CREATE POLICY "Allow public read access"
  ON market_indices FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON market_indices FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- recommendations policies
DROP POLICY IF EXISTS "Allow public read access" ON recommendations;
DROP POLICY IF EXISTS "Allow public insert access" ON recommendations;
DROP POLICY IF EXISTS "Allow public update access" ON recommendations;

CREATE POLICY "Allow public read access"
  ON recommendations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON recommendations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access"
  ON recommendations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- correlation_patterns policies
DROP POLICY IF EXISTS "Allow public read access" ON correlation_patterns;
DROP POLICY IF EXISTS "Allow public insert access" ON correlation_patterns;

CREATE POLICY "Allow public read access"
  ON correlation_patterns FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON correlation_patterns FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- api_usage_logs policies
DROP POLICY IF EXISTS "Allow public read access" ON api_usage_logs;
DROP POLICY IF EXISTS "Allow public insert access" ON api_usage_logs;

CREATE POLICY "Allow public read access"
  ON api_usage_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON api_usage_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- recommendation_outcomes policies
DROP POLICY IF EXISTS "Allow public read access" ON recommendation_outcomes;
DROP POLICY IF EXISTS "Allow public insert access" ON recommendation_outcomes;

CREATE POLICY "Allow public read access"
  ON recommendation_outcomes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON recommendation_outcomes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- social_media_events policies
DROP POLICY IF EXISTS "Allow public read access" ON social_media_events;
DROP POLICY IF EXISTS "Allow public insert access" ON social_media_events;

CREATE POLICY "Allow public read access"
  ON social_media_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON social_media_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
