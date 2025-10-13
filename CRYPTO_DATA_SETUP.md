# Crypto Data Collection Setup Guide

This guide explains how to set up automated crypto price data collection using Supabase Edge Functions and LiveCoinWatch API.

## Overview

The system collects two types of crypto price data:
1. **Historical Daily Prices**: From January 1, 2020 to present (OHLC format)
2. **5-Minute Interval Prices**: Rolling 24-hour window of recent prices

Data is collected for the top 10 cryptocurrencies by market cap.

## Prerequisites

1. **Supabase Project**: You need an active Supabase project
2. **LiveCoinWatch API Key**: Sign up at [https://www.livecoinwatch.com/tools/api](https://www.livecoinwatch.com/tools/api)
3. **Supabase CLI**: Install from [https://supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)

## Step 1: Set Up Database

Run the migrations to create the necessary tables:

```bash
# Link your Supabase project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

This creates three tables:
- `crypto_metadata`: Stores information about tracked cryptocurrencies
- `crypto_daily_prices`: Historical daily OHLC prices
- `crypto_5min_prices`: Recent 5-minute interval prices

## Step 2: Configure Environment Variables

In your Supabase project dashboard:

1. Go to **Project Settings** → **Edge Functions**
2. Add the following secrets:

```bash
# Add LiveCoinWatch API key
supabase secrets set LIVECOINWATCH_API_KEY=your_api_key_here
```

## Step 3: Deploy Edge Functions

Deploy the three Edge Functions:

```bash
# Deploy historical data fetcher
supabase functions deploy fetch-historical-prices

# Deploy 5-minute price updater
supabase functions deploy fetch-5min-prices

# Deploy daily price updater
supabase functions deploy update-daily-prices
```

## Step 4: Initial Historical Data Load

Run the historical data fetch function once to populate initial data:

```bash
# Using curl
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/fetch-historical-prices' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Or use the Supabase dashboard to invoke the function manually.

**Note**: This will take several minutes as it fetches data from 2020-01-01 for all 10 cryptocurrencies.

## Step 5: Set Up Scheduled Tasks

### Option A: Using Supabase Cron (Recommended)

Create cron jobs in your Supabase project:

```sql
-- Update 5-minute prices every 5 minutes
SELECT cron.schedule(
  'update-5min-crypto-prices',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/fetch-5min-prices',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);

-- Update daily prices every day at 00:05 UTC
SELECT cron.schedule(
  'update-daily-crypto-prices',
  '5 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/update-daily-prices',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

### Option B: Using External Cron Services

Use services like:
- **Cron-job.org**: Free cron service
- **GitHub Actions**: Use workflow scheduling
- **Vercel Cron**: If you have a Vercel deployment

Example GitHub Actions workflow (`.github/workflows/crypto-data-update.yml`):

```yaml
name: Update Crypto Prices

on:
  schedule:
    # Run every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  update-prices:
    runs-on: ubuntu-latest
    steps:
      - name: Call 5-min prices function
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/fetch-5min-prices' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"

  update-daily:
    runs-on: ubuntu-latest
    # Run only once per day at midnight
    if: github.event.schedule == '0 0 * * *'
    steps:
      - name: Call daily prices function
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/update-daily-prices' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

## Database Schema

### crypto_metadata
Stores metadata about tracked cryptocurrencies.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| symbol | text | Crypto symbol (BTC, ETH, etc.) |
| name | text | Full name |
| coin_id | text | LiveCoinWatch coin ID |
| rank | integer | Market cap rank |
| is_active | boolean | Whether to track this coin |

### crypto_daily_prices
Historical daily OHLC prices from 2020-01-01.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| symbol | text | Crypto symbol |
| coin_id | text | LiveCoinWatch coin ID |
| date | date | Date of the price |
| open | numeric | Opening price (USD) |
| high | numeric | Highest price (USD) |
| low | numeric | Lowest price (USD) |
| close | numeric | Closing price (USD) |
| volume | numeric | Trading volume |
| market_cap | numeric | Market capitalization |

### crypto_5min_prices
5-minute interval prices for the last 24 hours.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| symbol | text | Crypto symbol |
| coin_id | text | LiveCoinWatch coin ID |
| timestamp | timestamptz | Exact timestamp |
| price | numeric | Current price (USD) |
| volume | numeric | Trading volume |
| market_cap | numeric | Market capitalization |

## Edge Functions

### 1. fetch-historical-prices
Fetches all historical data from 2020-01-01 to present for all tracked cryptocurrencies.

- **Endpoint**: `POST /functions/v1/fetch-historical-prices`
- **Frequency**: Run once initially, then run daily to catch up
- **Rate Limit**: 1 request per second per cryptocurrency

### 2. fetch-5min-prices
Fetches current prices for all cryptocurrencies and stores them with 5-minute intervals.

- **Endpoint**: `POST /functions/v1/fetch-5min-prices`
- **Frequency**: Every 5 minutes
- **Auto-cleanup**: Removes data older than 24 hours

### 3. update-daily-prices
Updates today's daily OHLC prices based on the last 24 hours of data.

- **Endpoint**: `POST /functions/v1/update-daily-prices`
- **Frequency**: Once per day (preferably at midnight UTC)

## API Usage and Rate Limits

LiveCoinWatch API has the following rate limits:
- **Free Plan**: 1,000 requests per day
- **Paid Plans**: Higher limits available

Our implementation:
- Historical fetch: ~10 requests (one per cryptocurrency)
- 5-minute updates: 1 request per execution (fetches all coins at once)
- Daily updates: ~10 requests

**Estimated daily usage**: 
- 5-min updates (288 times/day): 288 requests
- Daily updates (1 time/day): 10 requests
- **Total**: ~298 requests/day (within free tier)

## Monitoring

Check API usage logs:

```sql
SELECT 
  api_name,
  endpoint,
  COUNT(*) as call_count,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_calls
FROM api_usage_logs
WHERE called_at > now() - interval '24 hours'
GROUP BY api_name, endpoint;
```

Check latest data:

```sql
-- Check latest 5-minute prices
SELECT symbol, timestamp, price
FROM crypto_5min_prices
ORDER BY timestamp DESC
LIMIT 10;

-- Check daily price coverage
SELECT symbol, COUNT(*) as days_of_data
FROM crypto_daily_prices
GROUP BY symbol
ORDER BY symbol;
```

## Troubleshooting

### Function Fails with 401 Error
- Check that `LIVECOINWATCH_API_KEY` is set correctly
- Verify your API key is active at LiveCoinWatch

### No Data Being Inserted
- Check function logs in Supabase dashboard
- Verify RLS policies allow service role to insert data
- Check API usage logs for error messages

### Historical Data Taking Too Long
- The initial load fetches ~1,500+ days of data for 10 coins
- This is normal and can take 10-20 minutes
- Progress is logged in the function execution

### Rate Limit Exceeded
- The functions include 1-second delays between requests
- If you hit limits, consider upgrading your LiveCoinWatch plan
- Check `api_usage_logs` table for usage patterns

## Adding More Cryptocurrencies

To track additional cryptocurrencies:

```sql
INSERT INTO crypto_metadata (symbol, name, coin_id, rank) 
VALUES ('MATIC', 'Polygon', 'MATIC', 11);
```

Then run the historical fetch function again to populate its data.

## Next Steps

With crypto price data collection set up, you can now:
1. Build correlation analysis between news events and price movements
2. Train ML models on historical patterns
3. Create real-time price alerts
4. Develop trading signals based on multi-factor analysis

## Support

For issues or questions:
- Check Supabase logs in the dashboard
- Review `api_usage_logs` table for API call patterns
- Consult LiveCoinWatch API documentation
