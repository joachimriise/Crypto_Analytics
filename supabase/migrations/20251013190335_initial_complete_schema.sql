/*
  # Complete Crypto Analytics Schema

  1. New Tables
    - `crypto_prices` - Live and historical crypto price data
    - `news_events` - News articles with sentiment analysis
    - `market_indices` - Stock market indices (S&P 500, etc)
    - `social_media_events` - Social media posts and sentiment
    - `correlation_patterns` - Event-to-price correlation data
    - `recommendations` - AI-generated buy/sell recommendations
    - `recommendation_outcomes` - Track recommendation accuracy
    - `user_portfolios` - User crypto holdings (future use)
    - `api_usage_logs` - Track API call usage
    - `market_trend_predictions` - Hourly market trend predictions

  2. Security
    - Enable RLS on all tables
    - Allow public read and insert access (public analytics dashboard)
    - No authentication required for this version

  3. Indexes
    - Optimized for time-series queries
    - Symbol lookups
    - Recent data queries
*/

-- Crypto prices table
CREATE TABLE IF NOT EXISTS crypto_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  name text NOT NULL,
  price_usd numeric NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  volume numeric NOT NULL,
  market_cap numeric NOT NULL,
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_prices_symbol_timestamp 
  ON crypto_prices(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_timestamp 
  ON crypto_prices(timestamp DESC);

ALTER TABLE crypto_prices ENABLE ROW LEVEL SECURITY;

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

-- News events table
CREATE TABLE IF NOT EXISTS news_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  source text NOT NULL,
  url text,
  category text NOT NULL,
  sentiment_score numeric DEFAULT 0,
  impact_level text DEFAULT 'medium',
  published_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_events_published_at 
  ON news_events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_events_category 
  ON news_events(category);

ALTER TABLE news_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON news_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON news_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Market indices table
CREATE TABLE IF NOT EXISTS market_indices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  index_name text NOT NULL,
  value numeric NOT NULL,
  change_percent numeric DEFAULT 0,
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_indices_timestamp 
  ON market_indices(timestamp DESC);

ALTER TABLE market_indices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON market_indices FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON market_indices FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Social media events table
CREATE TABLE IF NOT EXISTS social_media_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL,
  platform text NOT NULL,
  content text NOT NULL,
  url text,
  sentiment_score numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  posted_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_media_events_posted_at 
  ON social_media_events(posted_at DESC);

ALTER TABLE social_media_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON social_media_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON social_media_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Correlation patterns table
CREATE TABLE IF NOT EXISTS correlation_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_id uuid NOT NULL,
  crypto_symbol text NOT NULL,
  price_change_percent numeric NOT NULL,
  time_lag_hours integer DEFAULT 0,
  confidence_score numeric DEFAULT 0.5,
  occurrence_count integer DEFAULT 1,
  event_timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correlation_patterns_crypto_symbol 
  ON correlation_patterns(crypto_symbol);
CREATE INDEX IF NOT EXISTS idx_correlation_patterns_event_type 
  ON correlation_patterns(event_type);

ALTER TABLE correlation_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON correlation_patterns FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON correlation_patterns FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crypto_symbol text NOT NULL,
  action text NOT NULL,
  confidence_percent numeric NOT NULL,
  reasoning text NOT NULL,
  trigger_event_ids jsonb DEFAULT '[]'::jsonb,
  target_price numeric,
  stop_loss numeric,
  is_active boolean DEFAULT true,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_crypto_symbol 
  ON recommendations(crypto_symbol);
CREATE INDEX IF NOT EXISTS idx_recommendations_is_active 
  ON recommendations(is_active);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

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

-- Recommendation outcomes table
CREATE TABLE IF NOT EXISTS recommendation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES recommendations(id),
  actual_price_change_percent numeric NOT NULL,
  was_accurate boolean NOT NULL,
  measured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_outcomes_recommendation_id 
  ON recommendation_outcomes(recommendation_id);

ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON recommendation_outcomes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON recommendation_outcomes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- User portfolios table
CREATE TABLE IF NOT EXISTS user_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crypto_symbol text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  average_buy_price numeric NOT NULL,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id 
  ON user_portfolios(user_id);

ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON user_portfolios FOR SELECT
  TO anon, authenticated
  USING (true);

-- API usage logs table
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

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_called_at 
  ON api_usage_logs(called_at DESC);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON api_usage_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON api_usage_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Market trend predictions table
CREATE TABLE IF NOT EXISTS market_trend_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_type text NOT NULL CHECK (prediction_type IN ('positive', 'neutral', 'negative')),
  confidence_percent numeric NOT NULL CHECK (confidence_percent >= 0 AND confidence_percent <= 100),
  reasoning text NOT NULL,
  average_price_change numeric NOT NULL DEFAULT 0,
  bullish_count integer NOT NULL DEFAULT 0,
  bearish_count integer NOT NULL DEFAULT 0,
  neutral_count integer NOT NULL DEFAULT 0,
  news_sentiment_score numeric DEFAULT 0,
  macro_events_summary text DEFAULT '',
  predicted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_predictions_predicted_at 
  ON market_trend_predictions(predicted_at DESC);

ALTER TABLE market_trend_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON market_trend_predictions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON market_trend_predictions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
