# Crypto Data Collection - Quick Reference

## 📋 Quick Commands

### Initial Setup
```bash
# 1. Set LiveCoinWatch API key in Supabase
supabase secrets set LIVECOINWATCH_API_KEY=your_api_key

# 2. Deploy Edge Functions
supabase functions deploy fetch-historical-prices
supabase functions deploy fetch-5min-prices
supabase functions deploy update-daily-prices

# 3. Run initial historical data load (one-time)
curl -X POST 'https://your-project.supabase.co/functions/v1/fetch-historical-prices' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Manual Triggers
```bash
# Update 5-minute prices manually
curl -X POST 'https://your-project.supabase.co/functions/v1/fetch-5min-prices' \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Update daily prices manually
curl -X POST 'https://your-project.supabase.co/functions/v1/update-daily-prices' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 🗄️ Database Tables

### crypto_metadata
Tracks which cryptocurrencies to monitor
- **Key columns**: symbol, name, coin_id, rank, is_active
- **Usage**: Add/remove cryptos to track

### crypto_daily_prices
Historical daily OHLC prices since 2020-01-01
- **Key columns**: symbol, date, open, high, low, close, volume, market_cap
- **Index**: symbol + date
- **Data range**: 2020-01-01 to present (~1,800+ days per crypto)

### crypto_5min_prices
Real-time 5-minute interval prices (rolling 24h window)
- **Key columns**: symbol, timestamp, price, volume, market_cap
- **Index**: symbol + timestamp
- **Auto-cleanup**: Data older than 24h is removed
- **Data points**: ~288 per day per crypto

## 📊 Data Collection Schedule

| Function | Frequency | Purpose | API Calls |
|----------|-----------|---------|-----------|
| fetch-historical-prices | Once (initial) | Load all historical data | ~10 |
| fetch-5min-prices | Every 5 minutes | Real-time price updates | 1 |
| update-daily-prices | Daily at 00:05 UTC | Update today's OHLC | ~10 |

**Daily API Usage**: ~298 calls (within free tier of 1,000)

## 🔍 Monitoring Queries

### Check Latest Data
```sql
-- Latest 5-minute prices
SELECT symbol, timestamp, price 
FROM crypto_5min_prices 
ORDER BY timestamp DESC LIMIT 10;

-- Today's daily prices
SELECT symbol, date, open, high, low, close 
FROM crypto_daily_prices 
WHERE date = CURRENT_DATE;
```

### Check Data Coverage
```sql
-- Daily price coverage by crypto
SELECT 
  symbol,
  MIN(date) as earliest,
  MAX(date) as latest,
  COUNT(*) as total_days
FROM crypto_daily_prices
GROUP BY symbol;

-- 5-minute data points (last hour)
SELECT symbol, COUNT(*) as data_points
FROM crypto_5min_prices
WHERE timestamp > now() - interval '1 hour'
GROUP BY symbol;
```

### Monitor API Usage
```sql
-- API calls in last 24 hours
SELECT 
  api_name,
  endpoint,
  COUNT(*) as calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
FROM api_usage_logs
WHERE called_at > now() - interval '24 hours'
GROUP BY api_name, endpoint;
```

## ⚡ Edge Functions

### fetch-historical-prices
- **Endpoint**: `/functions/v1/fetch-historical-prices`
- **Method**: POST
- **When to run**: Once initially, then optionally weekly
- **Duration**: 10-20 minutes (fetches ~1,800 days × 10 cryptos)
- **Rate limit**: 1 request/second per crypto

### fetch-5min-prices
- **Endpoint**: `/functions/v1/fetch-5min-prices`
- **Method**: POST
- **When to run**: Every 5 minutes (automated)
- **Duration**: ~2-3 seconds
- **Auto-cleanup**: Removes data >24h old

### update-daily-prices
- **Endpoint**: `/functions/v1/update-daily-prices`
- **Method**: POST
- **When to run**: Daily at midnight UTC
- **Duration**: ~1-2 minutes
- **Action**: Calculates today's OHLC from intraday data

## 🔧 Common Tasks

### Add a New Cryptocurrency
```sql
INSERT INTO crypto_metadata (symbol, name, coin_id, rank, is_active)
VALUES ('MATIC', 'Polygon', 'MATIC', 11, true);

-- Then run historical fetch to populate its data
```

### Disable Tracking
```sql
UPDATE crypto_metadata 
SET is_active = false 
WHERE symbol = 'USDT';
```

### Re-enable Tracking
```sql
UPDATE crypto_metadata 
SET is_active = true 
WHERE symbol = 'USDT';
```

### Manual Cleanup
```sql
-- Clean old 5-minute data
SELECT cleanup_old_5min_prices();

-- Or directly
DELETE FROM crypto_5min_prices 
WHERE timestamp < now() - interval '24 hours';
```

## 🚨 Troubleshooting

### No Data Being Collected
1. Check Edge Function logs in Supabase Dashboard
2. Verify `LIVECOINWATCH_API_KEY` is set correctly
3. Check API usage logs: `SELECT * FROM api_usage_logs ORDER BY called_at DESC LIMIT 10;`
4. Ensure RLS policies allow service role access

### Function Timeout
- Historical fetch can take 10-20 minutes (normal)
- Check Supabase function timeout settings (default 10min)
- Consider increasing timeout for historical fetch

### Rate Limit Exceeded
- Free tier: 1,000 requests/day
- Current usage: ~298/day
- Monitor: Check `api_usage_logs` table
- Solution: Upgrade LiveCoinWatch plan if needed

### Missing Historical Data
```sql
-- Find missing dates
WITH date_series AS (
  SELECT generate_series(
    '2020-01-01'::date,
    CURRENT_DATE,
    '1 day'::interval
  )::date AS date
)
SELECT cm.symbol, ds.date as missing_date
FROM crypto_metadata cm
CROSS JOIN date_series ds
LEFT JOIN crypto_daily_prices cdp 
  ON cm.symbol = cdp.symbol AND ds.date = cdp.date
WHERE cdp.date IS NULL
  AND cm.is_active = true
ORDER BY cm.symbol, ds.date;
```

## 📈 Data Usage Examples

### Get Price History for Analysis
```sql
-- Last 90 days of daily prices
SELECT date, symbol, close, volume
FROM crypto_daily_prices
WHERE date > CURRENT_DATE - interval '90 days'
ORDER BY date DESC, symbol;
```

### Calculate Returns
```sql
-- Daily returns for correlation analysis
SELECT 
  date,
  symbol,
  close,
  ((close - LAG(close) OVER (PARTITION BY symbol ORDER BY date)) 
    / LAG(close) OVER (PARTITION BY symbol ORDER BY date) * 100) as daily_return
FROM crypto_daily_prices
WHERE date > CURRENT_DATE - interval '90 days'
ORDER BY date DESC, symbol;
```

### Intraday Analysis
```sql
-- Today's price movements (5-min data)
SELECT 
  symbol,
  timestamp,
  price,
  (price - FIRST_VALUE(price) OVER (
    PARTITION BY symbol 
    ORDER BY timestamp
  )) / FIRST_VALUE(price) OVER (
    PARTITION BY symbol 
    ORDER BY timestamp
  ) * 100 as change_percent
FROM crypto_5min_prices
WHERE timestamp::date = CURRENT_DATE
ORDER BY symbol, timestamp;
```

## 🔗 Useful Links

- [Full Setup Guide](CRYPTO_DATA_SETUP.md)
- [SQL Helper Queries](supabase/sql/crypto_helper_queries.sql)
- [LiveCoinWatch API Docs](https://www.livecoinwatch.com/tools/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## 💡 Tips

- **Initial load**: Run `fetch-historical-prices` once, takes 10-20 min
- **Monitoring**: Check logs daily in Supabase Dashboard → Edge Functions
- **Storage**: Daily prices ~10MB/year, 5-min data ~50MB rolling
- **Backup**: Supabase auto-backups daily, download for long-term storage
- **Testing**: Use `workflow_dispatch` in GitHub Actions for manual runs
