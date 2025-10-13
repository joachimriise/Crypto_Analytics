# Quick Start Guide

## Setup in 30 Seconds

### 1. Start the Application

```bash
npm run dev
```

Open your browser to the provided URL.

### 2. Wait 10-15 Seconds

The dashboard will automatically:
- ✅ Detect empty database
- ✅ Fetch live crypto prices from CoinGecko
- ✅ Collect market data
- ✅ Generate BUY/SELL recommendations
- ✅ Display everything

**That's it!** No buttons to click, no configuration needed.

## What You'll See

### Live Dashboard
- **Buy Opportunities** (Green Cards) - Cryptocurrencies recommended for purchase
- **Sell Signals** (Red Cards) - Cryptocurrencies recommended for selling
- **Live Price Grid** - Real-time prices for top 10 cryptos
- **News Feed** - Financial news with sentiment scores
- **Market Overview** - S&P 500 index showing market conditions
- **Auto-Refresh** - Updates every 5 minutes automatically

### Each Recommendation Includes:
- **Action**: BUY, SELL, or HOLD
- **Confidence**: 50-95% certainty
- **Reasoning**: Clear explanation of why
- **Target Price**: Expected price goal
- **Stop Loss**: Risk management level

## Auto-Refresh System

The dashboard automatically refreshes every 5 minutes:
1. Fetches latest crypto prices
2. Collects new financial news
3. Re-analyzes market conditions
4. Updates recommendations

**Manual Refresh:** Click the "Refresh" button in the top-right for immediate update.

## Optional: Load Historical Data

For 5 years of price history (optional, not required):

```bash
npm run setup
```

This runs once and takes 30-45 minutes due to API rate limits.

**When to use this:**
- You want deeper historical analysis
- You're testing recommendation accuracy over time
- You want to backtest the system

**When to skip this:**
- Just want current recommendations (most users)
- Want to get started immediately
- Don't need historical context

## Understanding Recommendations

### BUY Signal (Green Cards)
- **Triggers**: Positive news + price momentum + favorable market conditions
- **Target Price**: Typically +15% above current price
- **Stop Loss**: Typically -8% below current price
- **Confidence**: 60-95%

### SELL Signal (Red Cards)
- **Triggers**: Negative news + price decline + market downturn
- **Stop Loss**: Limit further losses
- **Confidence**: 60-95%

### HOLD Signal (Amber Cards)
- **Triggers**: Mixed signals or unclear trends
- **Action**: Wait for clearer market direction
- **Confidence**: 50-75%

## Tracked Cryptocurrencies

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

## Optional: Add API Keys for Enhanced Features

The system works perfectly without any API keys using CoinGecko (free, unlimited for basic usage).

For additional features, get free API keys:

### Alpha Vantage (S&P 500 Real Data)
1. Get key: https://www.alphavantage.co/support/#api-key
2. Open `src/lib/api/alpha-vantage.ts`
3. Replace `const API_KEY = 'demo';` with your key

### NewsAPI (Real Financial News)
1. Get key: https://newsapi.org/register
2. Open `src/lib/api/newsapi.ts`
3. Replace `const API_KEY = 'demo';` with your key

**Without these keys:**
- ✅ Real crypto prices (CoinGecko)
- ⚠️ Sample news articles
- ⚠️ Sample S&P 500 data

**With these keys:**
- ✅ Real crypto prices
- ✅ Real financial news
- ✅ Real S&P 500 data

## Troubleshooting

**Dashboard shows "Loading..." forever?**
- Check browser console (F12) for errors
- Verify `.env` file has Supabase credentials
- Wait 30 seconds (first load can be slow)

**No recommendations showing?**
- Wait 15-20 seconds for initial data collection
- Check that crypto prices loaded (scroll down to price grid)
- Click manual "Refresh" button

**Recommendations seem outdated?**
- Check "Last updated" timestamp in top-right
- Click "Refresh" button for immediate update
- System auto-refreshes every 5 minutes

**Want to restart fresh?**
- Clear the Supabase database tables
- Reload the page
- System will re-fetch all data automatically

## How It Works

### On First Load:
1. Dashboard checks if `crypto_prices` table is empty
2. If empty: Automatically runs `collectAndGenerate()`
3. Fetches live prices from CoinGecko API
4. Collects latest news
5. Generates recommendations based on analysis
6. Displays everything

### Every 5 Minutes:
1. Auto-refresh timer triggers
2. Fetches updated prices
3. Collects new news
4. Re-generates recommendations
5. Updates display
6. Updates "Last updated" timestamp

### Manual Refresh:
1. Click "Refresh" button
2. Same process as auto-refresh
3. Immediate update without waiting

## Data Architecture

**Database Tables:**
- `crypto_prices` - Live and historical price data
- `news_events` - Financial news with sentiment scores
- `recommendations` - Active BUY/SELL/HOLD signals
- `market_indices` - S&P 500 and market data
- `api_usage_logs` - API call tracking

**All tables have Row Level Security (RLS) enabled.**

## Important Notes

⚠️ **This is NOT financial advice**
- Educational and analytical tool only
- Always do your own research
- Past performance ≠ future results
- Consider your risk tolerance

✅ **All crypto data is real**
- Live prices from CoinGecko API
- Real market caps and volumes
- Actual 24-hour changes

🔄 **Auto-updating system**
- No manual intervention needed
- Runs continuously in background
- Always shows current recommendations

## Next Steps

1. **Watch Recommendations**: Monitor BUY/SELL signals on dashboard
2. **Check Reasoning**: Read why each recommendation was made
3. **Track Performance**: See how recommendations perform over time
4. **Customize**: Edit `src/lib/constants.ts` to add more cryptos
5. **Enhance**: Add API keys for real news and market data

## Support

The system is designed to be fully automatic. If something isn't working:
1. Check browser console for errors
2. Verify Supabase connection in `.env`
3. Try manual refresh button
4. Restart the dev server (`npm run dev`)

For architecture details, see `PROJECT_OVERVIEW.md`.
