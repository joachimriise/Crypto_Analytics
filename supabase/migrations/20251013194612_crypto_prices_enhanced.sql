/*
  # Enhanced Crypto Price Data Tables
  
  1. New Tables
    - `crypto_daily_prices` - Historical daily prices from 2020-01-01
    - `crypto_5min_prices` - 5-minute interval prices for last 24 hours
    - `crypto_metadata` - Metadata about tracked cryptocurrencies
    
  2. Indexes
    - Optimized for time-series queries
    - Symbol lookups
    - Latest data retrieval
*/

-- Crypto metadata table
CREATE TABLE IF NOT EXISTS crypto_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  name text NOT NULL,
  coin_id text UNIQUE NOT NULL,
  rank integer,
  is_active boolean DEFAULT true,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_metadata_symbol ON crypto_metadata(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_metadata_coin_id ON crypto_metadata(coin_id);

-- Daily prices table (historical data from 2020-01-01)
CREATE TABLE IF NOT EXISTS crypto_daily_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  coin_id text NOT NULL,
  date date NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume numeric NOT NULL,
  market_cap numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_crypto_daily_prices_symbol_date 
  ON crypto_daily_prices(symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_daily_prices_date 
  ON crypto_daily_prices(date DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_daily_prices_coin_id 
  ON crypto_daily_prices(coin_id);

-- 5-minute prices table (last 24 hours rolling window)
CREATE TABLE IF NOT EXISTS crypto_5min_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  coin_id text NOT NULL,
  timestamp timestamptz NOT NULL,
  price numeric NOT NULL,
  volume numeric NOT NULL,
  market_cap numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(symbol, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_crypto_5min_prices_symbol_timestamp 
  ON crypto_5min_prices(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_5min_prices_timestamp 
  ON crypto_5min_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_5min_prices_coin_id 
  ON crypto_5min_prices(coin_id);

-- Enable RLS
ALTER TABLE crypto_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_daily_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_5min_prices ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access" ON crypto_metadata FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON crypto_daily_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON crypto_5min_prices FOR SELECT TO anon, authenticated USING (true);

-- Service role full access (for Edge Functions)
CREATE POLICY "Allow service role full access" ON crypto_metadata FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON crypto_daily_prices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON crypto_5min_prices FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to clean up old 5-minute data (keep only last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_5min_prices()
RETURNS void AS $$
BEGIN
  DELETE FROM crypto_5min_prices 
  WHERE timestamp < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert top 10 cryptocurrencies
INSERT INTO crypto_metadata (symbol, name, coin_id, rank) VALUES
  ('BTC', 'Bitcoin', 'BTC', 1),
  ('ETH', 'Ethereum', 'ETH', 2),
  ('USDT', 'Tether', 'USDT', 3),
  ('BNB', 'BNB', 'BNB', 4),
  ('SOL', 'Solana', 'SOL', 5),
  ('USDC', 'USD Coin', 'USDC', 6),
  ('XRP', 'XRP', 'XRP', 7),
  ('DOGE', 'Dogecoin', 'DOGE', 8),
  ('ADA', 'Cardano', 'ADA', 9),
  ('TRX', 'TRON', 'TRX', 10)
ON CONFLICT (symbol) DO NOTHING;
