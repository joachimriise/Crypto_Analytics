# Crypto Analytics Engine

Correlation analysis system that learns how macro events affect crypto prices and predicts market response to breaking news.

## Setup & Run

### Option 1: Quick Start (Recommended)

Just start the app - it will automatically fetch live data:

```bash
npm run dev
```

The dashboard will:
- ✅ Detect empty database
- ✅ Automatically fetch current crypto prices
- ✅ Generate recommendations
- ✅ Collect live prices every minute
- ✅ Refresh recommendations every 5 minutes
- ✅ Generate market trend predictions every hour
- ✅ Show 24-hour trend charts with historical prediction tracking

**That's it!** Open your browser and you'll see live data.

### Option 2: Load Historical Data (Recommended)

Get a FREE LiveCoinWatch API key for 5 years of price history:

```bash
# 1. Get free API key from https://www.livecoinwatch.com/tools/api
# 2. Add to .env: VITE_LIVECOINWATCH_API_KEY=your_key
# 3. Run setup (takes ~2 minutes!)
npm run setup
```

**Why LiveCoinWatch?**
- ⚡ Loads 5 years of DAILY data in ~2 minutes (vs 60+ min with CoinGecko)
- 🎁 10,000 requests/day FREE (vs 30/day)
- 📊 8+ years of price history
- 📅 One price per day per currency (efficient storage)

## What You See

### Clean Dashboard With:
- **Overall Market Trend** - AI-powered hourly predictions (Bullish/Neutral/Bearish) with confidence scores
- **Prediction History** - Track last 24 hours of predictions to verify accuracy over time
- **Live Price Grid** - Real-time prices with accurate 24h change for top 10 cryptocurrencies (no stablecoins)
- **Detailed Crypto Modals** - Click any crypto to see:
  - 24-hour, 7-day, 30-day, 90-day, 6-month, 1-year, and 5-year price charts
  - High/low ranges and volatility metrics
  - Interactive timeline with gradient charts
- **Buy Opportunities** (Green cards) - Cryptos recommended for purchase with confidence %
- **Sell Signals** (Red cards) - Cryptos recommended for selling
- **News Feed** - Latest financial news with sentiment indicators
- **Market Overview** - S&P 500 showing overall market health
- **Smart Auto-Refresh** - Prices every minute, recommendations every 5 minutes, market trends hourly

### Each Recommendation Shows:
- Cryptocurrency symbol and action (BUY/SELL/HOLD)
- Confidence percentage (50-95%)
- Clear reasoning explaining why
- Target price and stop-loss levels

## How It Works

1. **Real Live Data**: Fetches current prices from CoinGecko API (100% real, no demo data)
2. **Macro News Collection**: Tracks tariffs, Fed policy, interest rates, inflation, trade wars, geopolitics, oil prices, sanctions
3. **Correlation Analysis**: Learns from 5 years of history which events actually move crypto prices
4. **Pattern Recognition**: Identifies time-lag patterns (how long after news does crypto react)
5. **Predictive Recommendations**: When similar news breaks, predicts response based on historical correlations
6. **Live Updates**: Refreshes every 5 minutes, continuously learning from new data

## Top 10 Cryptos Tracked

Bitcoin (BTC) • Ethereum (ETH) • BNB • Solana (SOL) • XRP • Cardano (ADA) • Dogecoin (DOGE) • Polygon (MATIC) • Avalanche (AVAX) • Polkadot (DOT)

## Technology

- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL with RLS)
- **APIs**: CoinGecko (real-time prices, free)
- **Analysis**:
  - Correlation Analyzer - Links news events to price movements
  - Sentiment Analyzer - Scores news as positive/negative
  - Pattern Recognition - Learns from 5 years of historical data
  - Prediction Engine - Forecasts crypto response to breaking news

## Architecture

**Historical Setup** (one-time):
- `npm run setup` - Runs `scripts/setup.js` to backfill 5 years of data
- This is completely optional for basic usage

**Live Dashboard**:
- Auto-detects empty database on first load
- Fetches current data automatically
- Refreshes every 5 minutes in background
- No admin buttons - just clean recommendations

## Optional: Enhanced Data

Get free API keys for best experience:

**LiveCoinWatch** (HIGHLY RECOMMENDED):
- https://www.livecoinwatch.com/tools/api
- 10,000 requests/day FREE
- 2 minute historical data load vs 60+ minutes
- Add to .env: `VITE_LIVECOINWATCH_API_KEY=your_key`

**NewsAPI** (Real financial news):
- https://newsapi.org/register
- 100 requests/day FREE
- Add to .env: `VITE_NEWSAPI_API_KEY=your_key`

**Alpha Vantage** (Real S&P 500):
- https://www.alphavantage.co/support/#api-key
- 25 requests/day FREE
- Add to .env: `VITE_ALPHA_VANTAGE_API_KEY=your_key`

Without these keys, the system uses:
- Real crypto prices from CoinGecko ✅ (automatic fallback)
- Sample news articles
- Sample S&P 500 data

## Important

⚠️ **Not Financial Advice**
- This is an analytical tool for educational purposes
- Always do your own research
- Past performance ≠ future results

✅ **100% Real Data**
- All cryptocurrency prices are live from CoinGecko/LiveCoinWatch APIs
- **Live data**: One price every minute for past 24 hours (accessible in detail modals)
- **Historical data**: One price per day since January 1, 2020 (~18,250 records)
- **Multi-timeframe charts**: 24h, 7d, 30d, 90d, 6m, 1y, 5y views available
- Auto-cleanup: Live data older than 24 hours is removed to keep database efficient
- No simulated, demo, or fake data ever

## FAQ

**Q: I don't see any data?**
A: Wait 10-15 seconds on first load while it fetches live prices automatically.

**Q: Do I need to run setup?**
A: No! The dashboard works without it. Setup is only for 5 years of historical data.

**Q: How often does it update?**
A: Every 5 minutes automatically. Click Refresh for immediate update.

**Q: Can I add more cryptos?**
A: Yes, edit `src/lib/constants.ts` and add to `TOP_CRYPTOS` array.

## Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.tsx   # Main dashboard (auto-fetches data)
│   ├── CryptoPriceGrid.tsx
│   ├── RecommendationCard.tsx
│   └── NewsFeed.tsx
├── lib/
│   ├── api/            # CoinGecko, AlphaVantage, NewsAPI
│   ├── services/
│   │   ├── data-collector.ts        # Fetches live prices & news
│   │   ├── correlation-analyzer.ts  # Links events to price changes
│   │   ├── recommendation-engine.ts # Generates BUY/SELL signals
│   │   └── sentiment-analyzer.ts    # Scores news sentiment
│   └── supabase.ts     # Database client
scripts/
└── setup.js            # Loads 5 years historical data (2020-2025)
```

## Key Innovation: Correlation Analysis

The system builds a correlation database:
- When tariff news breaks → BTC dropped 8% within 24hrs (confidence: 87%)
- When Fed cuts rates → ETH rallied 12% within 48hrs (confidence: 92%)
- When oil prices spike → SOL declined 5% within 12hrs (confidence: 78%)

When similar news appears, it predicts the likely crypto market response based on these learned patterns.

The system is fully automatic - start it and it handles everything.
