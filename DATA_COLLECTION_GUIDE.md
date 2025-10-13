# Historical Data Collection Guide

This guide explains how to populate your Supabase database with historical crypto data for AI-powered trend analysis.

## 📊 What Data We're Collecting

### Historical Daily Prices (2020-01-01 to present)
- **Period**: January 1, 2020 to today
- **Frequency**: One price per day
- **Cryptocurrencies**: Top 10 by market cap
- **Total Records**: ~18,250 records (10 coins × ~1,825 days)
- **Purpose**: Long-term trend analysis and correlation with macro events

### Live Minute Prices (Last 24 hours)
- **Period**: Rolling 24-hour window
- **Frequency**: One price per minute
- **Cryptocurrencies**: Same top 10
- **Total Records**: ~14,400 records (10 coins × 1,440 minutes)
- **Purpose**: Short-term price action and volatility analysis

### Top 10 Cryptocurrencies
1. Bitcoin (BTC)
2. Ethereum (ETH)
3. BNB (BNB)
4. Solana (SOL)
5. XRP (XRP)
6. Cardano (ADA)
7. Dogecoin (DOGE)
8. Polygon (MATIC)
9. Avalanche (AVAX)
10. Polkadot (DOT)

---

## 🚀 Quick Start

### Prerequisites

1. **LiveCoinWatch API Key** (Free - 10,000 requests/day)
   - Go to: https://www.livecoinwatch.com/tools/api
   - Sign up for free account
   - Copy your API key

2. **Supabase Project**
   - Already set up ✅
   - Database schema created ✅

### Step 1: Configure Environment

Update your `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# LiveCoinWatch API
VITE_LIVECOINWATCH_API_KEY=your_api_key_here
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run Data Collection

```bash
npm run collect:historical
```

This will:
1. ✅ Fetch daily prices from 2020-01-01 to today (~5-10 minutes)
2. ✅ Fetch minute prices for last 24 hours (~2-3 minutes)
3. ✅ Store everything in Supabase
4. ✅ Verify data was stored correctly

**Total time**: ~10-15 minutes

---

## 📈 Expected Output

```
═══════════════════════════════════════════════════════
  Crypto Analytics - Historical Data Collection
═══════════════════════════════════════════════════════

✓ API key found
✓ Supabase connected

🚀 Starting historical data collection...

📊 Collecting daily prices from 2020-01-01 to today
💰 Cryptocurrencies: BTC, ETH, BNB, SOL, XRP, ADA, DOGE, MATIC, AVAX, DOT

📅 Date range: 2020-01-01 to 2025-10-13 (1,825 days)

[1/10] Processing Bitcoin (BTC)...
  📥 Fetching historical daily prices...
  💾 Storing 1825 daily prices...
  ✓ Stored 100 historical prices for BTC (1-100/1825)
  ✓ Stored 100 historical prices for BTC (101-200/1825)
  ...
  ✓ Stored 25 historical prices for BTC (1801-1825/1825)
  ⏳ Waiting 2 seconds before next coin...

[2/10] Processing Ethereum (ETH)...
  ...

✅ Historical data collection complete!

🕐 Starting minute-by-minute data collection (last 24 hours)...

[1/10] Processing Bitcoin (BTC)...
  📥 Fetching minute prices...
  💾 Storing 1440 minute prices...
  ✓ Stored 100 live prices for BTC
  ...

✅ Minute data collection complete!

📊 Verifying stored data...

Historical Prices:
  BTC: 1825 records
  ETH: 1825 records
  BNB: 1825 records
  SOL: 1825 records
  XRP: 1825 records
  ADA: 1825 records
  DOGE: 1825 records
  MATIC: 1825 records
  AVAX: 1825 records
  DOT: 1825 records

Live Prices (24h):
  BTC: 1440 records
  ETH: 1440 records
  BNB: 1440 records
  SOL: 1440 records
  XRP: 1440 records
  ADA: 1440 records
  DOGE: 1440 records
  MATIC: 1440 records
  AVAX: 1440 records
  DOT: 1440 records

⏱️  Total time: 823 seconds
✅ All data collection complete!

🎯 Next steps:
   1. Set up scheduled job to fetch new minute prices every minute
   2. Set up daily job to fetch new daily prices
   3. Begin collecting news events for correlation analysis
```

---

## 📊 Verify Data in Supabase

1. Go to your Supabase dashboard
2. Click "Table Editor"
3. Check `historical_prices` table
4. Check `live_prices` table

You should see thousands of records!

---

## 🔄 Continuous Data Collection

### Option 1: Supabase Edge Function (Recommended for Bolt.new)

Create a scheduled edge function that runs every minute:

```typescript
// supabase/functions/fetch-live-prices/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LCW_API_KEY = Deno.env.get('LIVECOINWATCH_API_KEY')
const COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC', 'AVAX', 'DOT']

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  for (const coin of COINS) {
    const response = await fetch('https://api.livecoinwatch.com/coins/single', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': LCW_API_KEY!,
      },
      body: JSON.stringify({ currency: 'USD', code: coin, meta: true })
    })

    const data = await response.json()

    await supabase.from('live_prices').insert({
      symbol: coin,
      name: data.name,
      price: data.rate,
      change_24h: data.delta?.day,
      volume_24h: data.volume,
      market_cap: data.cap,
      timestamp: new Date().toISOString()
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Deploy and schedule:
```bash
npx supabase functions deploy fetch-live-prices
npx supabase functions schedule fetch-live-prices --cron "* * * * *"
```

### Option 2: Cron Job (For Traditional Servers)

```bash
# Add to crontab
crontab -e

# Fetch live prices every minute
* * * * * cd /path/to/Crypto_Analytics && node scripts/fetch-live-prices.js

# Fetch daily prices at midnight
0 0 * * * cd /path/to/Crypto_Analytics && node scripts/fetch-daily-prices.js

# Cleanup old live prices (keep only 24h)
0 * * * * cd /path/to/Crypto_Analytics && node scripts/cleanup-old-prices.js
```

---

## 🧹 Data Cleanup

### Remove Old Live Prices (Keep Only 24 Hours)

Run this SQL in Supabase:

```sql
-- Delete live prices older than 24 hours
DELETE FROM live_prices 
WHERE timestamp < NOW() - INTERVAL '24 hours';

-- Or create a scheduled function
CREATE OR REPLACE FUNCTION cleanup_old_live_prices()
RETURNS void AS $$
BEGIN
  DELETE FROM live_prices 
  WHERE timestamp < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Schedule to run every hour
SELECT cron.schedule(
  'cleanup-old-prices',
  '0 * * * *',
  $$SELECT cleanup_old_live_prices()$$
);
```

---

## 💡 API Rate Limits

### LiveCoinWatch Free Tier
- **Requests**: 10,000 per day
- **Rate**: ~1 request every 8.6 seconds on average

### Our Usage
- **Initial collection**: ~30 requests (10 coins × 3 endpoints)
- **Continuous collection**: 10 requests/minute (one per coin)
- **Daily usage**: ~14,400 requests (within free tier!)

---

## 🎯 Next Steps for AI Analysis

Once data is collected, you can:

1. **Collect Major Events**
   - News articles (NewsAPI)
   - Federal Reserve announcements
   - Economic indicators
   - Geopolitical events
   - Crypto-specific news

2. **Correlation Analysis**
   - Match event timestamps with price changes
   - Calculate correlation coefficients
   - Identify time-lag patterns
   - Build predictive models

3. **AI Predictions**
   - Train models on historical correlations
   - Generate buy/sell recommendations
   - Predict market sentiment
   - Alert on significant events

---

## 🔧 Troubleshooting

### API Key Error
```
❌ Error: VITE_LIVECOINWATCH_API_KEY not found in .env file
```
**Solution**: Add your API key to `.env` file

### Supabase Connection Error
```
❌ Error: Supabase credentials not found in .env file
```
**Solution**: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to `.env`

### Rate Limit Exceeded
```
❌ API error: 429 (Too Many Requests)
```
**Solution**: The script includes automatic rate limiting (2 second delays). If you still hit limits, increase delays in the script.

### No Data Received
```
⚠️  No historical data received
```
**Solution**: Check if your API key is valid and has remaining quota

---

## 📞 Need Help?

1. Check Supabase logs in dashboard
2. Verify API key is active at https://www.livecoinwatch.com
3. Review the script output for specific errors
4. Check database tables in Supabase Table Editor

---

**Ready to collect your data?** Run: `npm run collect:historical`
