# API Setup Guide

This guide will help you obtain the necessary API keys to run the Crypto Analytics Engine with 100% real data.

## LiveCoinWatch API (HIGHLY RECOMMENDED)

**Best option for cryptocurrency data** - Much faster and more generous than CoinGecko!

### Why LiveCoinWatch?
- ✅ **10,000 requests/day** (vs CoinGecko's 30/day free tier)
- ✅ **8+ years of price history** (covers 2020-2025 perfectly)
- ✅ **100% FREE** - No credit card required
- ✅ **2 minute setup** - Historical data loads in ~2 minutes (vs 60+ minutes with CoinGecko)
- ✅ **Updates every 2 seconds**

**How to Get:**
1. Visit https://www.livecoinwatch.com/
2. Click "Sign Up" in the top right
3. Create a free account
4. Go to https://www.livecoinwatch.com/tools/api
5. Copy your API key from the dashboard

**Add to .env file:**
```bash
VITE_LIVECOINWATCH_API_KEY=your_key_here
```

**Load 5 years of data in ~2 minutes:**
```bash
npm run setup
```

### CoinGecko API (Automatic Fallback)

**Free Tier:** ~30 calls/day (very limited)

The system automatically uses CoinGecko as a fallback if LiveCoinWatch is unavailable. No API key needed, but very slow for historical data (60+ minutes vs 2 minutes).

### Alpha Vantage API (Optional - Stock Market Data)

**Free Tier:** 5 calls/minute, 500 calls/day

**How to Get:**
1. Visit https://www.alphavantage.co/support/#api-key
2. Enter your email and click "GET FREE API KEY"
3. You'll receive your API key instantly
4. Copy the API key from the confirmation page

**To Add to Project:**
Add to your `.env` file:
```bash
VITE_ALPHA_VANTAGE_API_KEY=YOUR_KEY_HERE
```

### NewsAPI (Optional - Financial News)

**Free Tier:** 100 requests/day

**How to Get:**
1. Visit https://newsapi.org/register
2. Fill out the registration form
3. Confirm your email
4. Login and find your API key in the dashboard at https://newsapi.org/account
5. Free tier gives access to historical news (up to 1 month back) and current headlines

**To Add to Project:**
Add to your `.env` file:
```bash
VITE_NEWSAPI_API_KEY=YOUR_KEY_HERE
```

## Complete .env File Example

```bash
# Supabase (pre-configured)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# LiveCoinWatch (HIGHLY RECOMMENDED - 10k requests/day, FREE)
VITE_LIVECOINWATCH_API_KEY=your_key_here

# NewsAPI (optional - 100 requests/day)
VITE_NEWSAPI_API_KEY=your_key_here

# Alpha Vantage (optional - 25 requests/day)
VITE_ALPHA_VANTAGE_API_KEY=your_key_here
```

## Important Notes

1. **Rate Limits:** All APIs have free tiers with rate limits. The application includes built-in rate limiting to prevent exceeding these limits.

2. **Demo Keys:** The application is configured with demo keys that have severe limitations. For real usage, you MUST replace these with your own API keys.

3. **API Usage Tracking:** The app logs all API calls to the `api_usage_logs` table in Supabase, helping you monitor usage and stay within free tier limits.

4. **Data Collection Strategy:**
   - Historical backfill should be run once to populate 5 years of data
   - After that, run hourly/daily collection to keep data fresh
   - Be mindful of rate limits when running backfill operations

## Quick Start

### Option 1: Start Immediately (Live Data Only)
```bash
npm run dev
```
Dashboard works with live data right away using CoinGecko fallback.

### Option 2: Best Experience (Recommended)
1. Get free LiveCoinWatch API key (2 minutes)
2. Add to .env file: `VITE_LIVECOINWATCH_API_KEY=your_key`
3. Load 5 years of history: `npm run setup` (takes ~2 minutes)
4. Start dashboard: `npm run dev`

### Option 3: Maximum Features
1. Get all three API keys (LiveCoinWatch, NewsAPI, Alpha Vantage)
2. Add all to .env file
3. Run setup: `npm run setup`
4. Start dashboard: `npm run dev`

## API Comparison

| Feature | CoinGecko Free | LiveCoinWatch Free | Paid |
|---------|---------------|-------------------|------|
| Requests/day | ~30 | 10,000 | Unlimited |
| Historical setup time | 60+ min | 2 min | Instant |
| API key required | No | Yes (free) | Yes |
| Price history | 5 years | 8+ years | All |
| **Recommendation** | Fallback | ⭐ **BEST** | Not needed |

### Cost Summary
- **LiveCoinWatch:** $0/month - 10,000 requests/day FREE
- **CoinGecko:** $0/month - ~30 requests/day FREE (automatic fallback)
- **NewsAPI:** $0/month - 100 requests/day FREE (optional)
- **Alpha Vantage:** $0/month - 25 requests/day FREE (optional)

**Total Cost: $0/month** - Run entirely for free!
