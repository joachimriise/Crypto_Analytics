-- Crypto Analytics Database Schema for Supabase
-- Run this in Supabase SQL Editor to create all tables

-- Enable Row Level Security by default
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Historical Prices Table
CREATE TABLE IF NOT EXISTS historical_prices (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_historical_price UNIQUE (symbol, timestamp)
);

CREATE INDEX idx_historical_prices_symbol ON historical_prices(symbol);
CREATE INDEX idx_historical_prices_timestamp ON historical_prices(timestamp DESC);

-- Enable RLS (allow public read)
ALTER TABLE historical_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON historical_prices
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON historical_prices
    FOR INSERT WITH CHECK (true);

-- Live Prices Table
CREATE TABLE IF NOT EXISTS live_prices (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    change_24h NUMERIC(10, 2),
    volume_24h NUMERIC(20, 2),
    market_cap NUMERIC(20, 2),
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_prices_symbol ON live_prices(symbol);
CREATE INDEX idx_live_prices_timestamp ON live_prices(timestamp DESC);

-- Enable RLS
ALTER TABLE live_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON live_prices
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON live_prices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete" ON live_prices
    FOR DELETE USING (true);

-- Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL', 'HOLD')),
    confidence NUMERIC(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    reasoning TEXT NOT NULL,
    target_price NUMERIC(20, 8),
    stop_loss NUMERIC(20, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX idx_recommendations_symbol ON recommendations(symbol);

-- Enable RLS
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON recommendations
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON recommendations
    FOR INSERT WITH CHECK (true);

-- Market Predictions Table
CREATE TABLE IF NOT EXISTS market_predictions (
    id BIGSERIAL PRIMARY KEY,
    trend TEXT NOT NULL CHECK (trend IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    confidence NUMERIC(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    reasoning TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_created_at ON market_predictions(created_at DESC);

-- Enable RLS
ALTER TABLE market_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON market_predictions
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON market_predictions
    FOR INSERT WITH CHECK (true);

-- Function to cleanup old live prices (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_live_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM live_prices
    WHERE timestamp < NOW() - INTERVAL '24 hours';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_live_prices() TO anon, authenticated;

-- Create a scheduled job to run cleanup daily (Supabase Cron)
-- Note: You'll need to enable pg_cron extension first in Database → Extensions

-- Optional: News Articles Table (for caching external news)
CREATE TABLE IF NOT EXISTS news_articles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    source TEXT,
    published_at TIMESTAMPTZ,
    sentiment TEXT CHECK (sentiment IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_published_at ON news_articles(published_at DESC);

-- Enable RLS
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON news_articles
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON news_articles
    FOR INSERT WITH CHECK (true);

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables: historical_prices, live_prices, recommendations, market_predictions, news_articles';
    RAISE NOTICE 'Row Level Security (RLS) enabled on all tables';
    RAISE NOTICE 'Public read/insert access granted';
END $$;
