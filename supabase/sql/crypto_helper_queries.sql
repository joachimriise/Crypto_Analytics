-- Crypto Data Collection Helper Queries
-- Use these queries to monitor and manage your crypto price data

-- ============================================
-- DATA MONITORING QUERIES
-- ============================================

-- Check latest 5-minute prices for all cryptocurrencies
SELECT 
  symbol,
  timestamp,
  price,
  volume,
  market_cap,
  created_at
FROM crypto_5min_prices
WHERE timestamp > now() - interval '1 hour'
ORDER BY timestamp DESC, symbol;

-- Check daily price data coverage by cryptocurrency
SELECT 
  symbol,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  COUNT(*) as total_days,
  COUNT(DISTINCT date) as unique_days
FROM crypto_daily_prices
GROUP BY symbol
ORDER BY symbol;

-- Get latest daily prices with OHLC data
SELECT 
  symbol,
  date,
  open,
  high,
  low,
  close,
  volume,
  ((close - open) / open * 100) as daily_change_percent
FROM crypto_daily_prices
WHERE date = CURRENT_DATE
ORDER BY symbol;

-- Check for missing dates in daily price data
WITH date_series AS (
  SELECT generate_series(
    '2020-01-01'::date,
    CURRENT_DATE,
    '1 day'::interval
  )::date AS date
),
crypto_dates AS (
  SELECT DISTINCT symbol, date
  FROM crypto_daily_prices
)
SELECT 
  cm.symbol,
  ds.date as missing_date
FROM crypto_metadata cm
CROSS JOIN date_series ds
LEFT JOIN crypto_dates cd ON cm.symbol = cd.symbol AND ds.date = cd.date
WHERE cd.date IS NULL
  AND cm.is_active = true
ORDER BY cm.symbol, ds.date;

-- ============================================
-- API USAGE MONITORING
-- ============================================

-- Check API usage in last 24 hours
SELECT 
  api_name,
  endpoint,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_calls,
  ROUND(AVG(response_time_ms), 2) as avg_response_time_ms
FROM api_usage_logs
WHERE called_at > now() - interval '24 hours'
GROUP BY api_name, endpoint
ORDER BY total_calls DESC;

-- Check recent API errors
SELECT 
  api_name,
  endpoint,
  error_message,
  called_at
FROM api_usage_logs
WHERE success = false
  AND called_at > now() - interval '24 hours'
ORDER BY called_at DESC
LIMIT 20;

-- Daily API usage trend (last 7 days)
SELECT 
  DATE(called_at) as date,
  api_name,
  COUNT(*) as calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
FROM api_usage_logs
WHERE called_at > now() - interval '7 days'
GROUP BY DATE(called_at), api_name
ORDER BY date DESC, api_name;

-- ============================================
-- PRICE ANALYSIS QUERIES
-- ============================================

-- Calculate 7-day moving average for each cryptocurrency
SELECT 
  symbol,
  date,
  close,
  AVG(close) OVER (
    PARTITION BY symbol 
    ORDER BY date 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as ma_7day
FROM crypto_daily_prices
WHERE date > CURRENT_DATE - interval '30 days'
ORDER BY symbol, date DESC;

-- Calculate daily volatility (high-low range)
SELECT 
  symbol,
  date,
  high,
  low,
  ((high - low) / low * 100) as daily_volatility_percent,
  volume
FROM crypto_daily_prices
WHERE date > CURRENT_DATE - interval '7 days'
ORDER BY date DESC, daily_volatility_percent DESC;

-- Compare price changes across cryptocurrencies
SELECT 
  symbol,
  date,
  close,
  LAG(close) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
  ((close - LAG(close) OVER (PARTITION BY symbol ORDER BY date)) 
    / LAG(close) OVER (PARTITION BY symbol ORDER BY date) * 100) as change_percent
FROM crypto_daily_prices
WHERE date > CURRENT_DATE - interval '7 days'
ORDER BY date DESC, change_percent DESC;

-- Get intraday price movements from 5-minute data
SELECT 
  symbol,
  DATE(timestamp) as date,
  MIN(price) as day_low,
  MAX(price) as day_high,
  FIRST_VALUE(price) OVER (PARTITION BY symbol, DATE(timestamp) ORDER BY timestamp) as open,
  LAST_VALUE(price) OVER (PARTITION BY symbol, DATE(timestamp) ORDER BY timestamp) as close
FROM crypto_5min_prices
GROUP BY symbol, DATE(timestamp), timestamp, price
ORDER BY date DESC, symbol;

-- ============================================
-- DATA MAINTENANCE QUERIES
-- ============================================

-- Manually clean up old 5-minute data
DELETE FROM crypto_5min_prices 
WHERE timestamp < now() - interval '24 hours';

-- Manually trigger cleanup function
SELECT cleanup_old_5min_prices();

-- Count total records per table
SELECT 
  'crypto_metadata' as table_name,
  COUNT(*) as record_count
FROM crypto_metadata
UNION ALL
SELECT 
  'crypto_daily_prices',
  COUNT(*)
FROM crypto_daily_prices
UNION ALL
SELECT 
  'crypto_5min_prices',
  COUNT(*)
FROM crypto_5min_prices
UNION ALL
SELECT 
  'api_usage_logs',
  COUNT(*)
FROM api_usage_logs;

-- Check database size for crypto tables
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('crypto_metadata', 'crypto_daily_prices', 'crypto_5min_prices', 'api_usage_logs')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- CRYPTOCURRENCY MANAGEMENT
-- ============================================

-- View all tracked cryptocurrencies
SELECT * FROM crypto_metadata
ORDER BY rank;

-- Add a new cryptocurrency to track
-- Example: Add Polygon (MATIC)
INSERT INTO crypto_metadata (symbol, name, coin_id, rank, is_active) 
VALUES ('MATIC', 'Polygon', 'MATIC', 11, true)
ON CONFLICT (symbol) DO NOTHING;

-- Disable tracking for a cryptocurrency
UPDATE crypto_metadata 
SET is_active = false 
WHERE symbol = 'USDT';

-- Re-enable tracking for a cryptocurrency
UPDATE crypto_metadata 
SET is_active = true 
WHERE symbol = 'USDT';

-- Update cryptocurrency rankings
UPDATE crypto_metadata 
SET rank = 1 WHERE symbol = 'BTC';
-- Add more as needed...

-- ============================================
-- PERFORMANCE QUERIES
-- ============================================

-- Find the best performing cryptocurrencies (last 7 days)
WITH recent_prices AS (
  SELECT 
    symbol,
    MAX(CASE WHEN date = CURRENT_DATE - 7 THEN close END) as price_7d_ago,
    MAX(CASE WHEN date = CURRENT_DATE THEN close END) as price_today
  FROM crypto_daily_prices
  WHERE date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE
  GROUP BY symbol
)
SELECT 
  symbol,
  price_7d_ago,
  price_today,
  ((price_today - price_7d_ago) / price_7d_ago * 100) as change_percent_7d
FROM recent_prices
WHERE price_7d_ago IS NOT NULL AND price_today IS NOT NULL
ORDER BY change_percent_7d DESC;

-- Find the most volatile cryptocurrencies (last 30 days)
SELECT 
  symbol,
  STDDEV(((high - low) / low * 100)) as volatility_stddev,
  AVG(((high - low) / low * 100)) as avg_daily_range
FROM crypto_daily_prices
WHERE date > CURRENT_DATE - interval '30 days'
GROUP BY symbol
ORDER BY volatility_stddev DESC;

-- ============================================
-- CORRELATION ANALYSIS PREP
-- ============================================

-- Get price data formatted for correlation analysis
SELECT 
  date,
  symbol,
  close as price,
  volume,
  ((close - LAG(close) OVER (PARTITION BY symbol ORDER BY date)) 
    / LAG(close) OVER (PARTITION BY symbol ORDER BY date) * 100) as daily_return
FROM crypto_daily_prices
WHERE date > CURRENT_DATE - interval '90 days'
ORDER BY date DESC, symbol;

-- Calculate correlation between BTC and other cryptocurrencies
-- (This is a simplified version - use Python/R for proper correlation calculation)
WITH btc_prices AS (
  SELECT date, close as btc_price
  FROM crypto_daily_prices
  WHERE symbol = 'BTC'
    AND date > CURRENT_DATE - interval '90 days'
)
SELECT 
  dp.symbol,
  dp.date,
  dp.close,
  bp.btc_price,
  ((dp.close - LAG(dp.close) OVER (PARTITION BY dp.symbol ORDER BY dp.date)) 
    / LAG(dp.close) OVER (PARTITION BY dp.symbol ORDER BY dp.date)) as coin_return,
  ((bp.btc_price - LAG(bp.btc_price) OVER (ORDER BY bp.date)) 
    / LAG(bp.btc_price) OVER (ORDER BY bp.date)) as btc_return
FROM crypto_daily_prices dp
JOIN btc_prices bp ON dp.date = bp.date
WHERE dp.symbol != 'BTC'
  AND dp.date > CURRENT_DATE - interval '90 days'
ORDER BY dp.symbol, dp.date DESC;
