# Crypto Analytics Engine

Correlation analysis system that learns how macro events affect crypto prices and predicts market response to breaking news.

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in minutes
- **[Crypto Data Setup](CRYPTO_DATA_SETUP.md)** - Configure automated price data collection
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to your server with auto-updates
- **[Project Overview](PROJECT_OVERVIEW.md)** - System architecture and features
- **[API Setup Guide](API_SETUP.md)** - Configure external data sources
- **[Correlation Analysis](CORRELATION_ANALYSIS.md)** - How the prediction engine works

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/joachimriise/Crypto_Analytics.git
cd Crypto_Analytics

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will automatically fetch live data and start tracking prices!

### Crypto Data Collection Setup

**Automated price data collection** using Supabase Edge Functions:

1. Follow the **[Crypto Data Setup Guide](CRYPTO_DATA_SETUP.md)** for detailed instructions
2. Set up your LiveCoinWatch API key
3. Deploy the three Edge Functions for data collection
4. Configure automated scheduling (every 5 minutes for real-time data)

See **[CRYPTO_DATA_SETUP.md](CRYPTO_DATA_SETUP.md)** for the complete setup process.

### Production Deployment

**One-line server setup:**
```bash
curl -fsSL https://raw.githubusercontent.com/joachimriise/Crypto_Analytics/main/scripts/server-setup.sh | bash
```

This will:
- ✅ Install Node.js, PM2, and all dependencies
- ✅ Clone and build your app
- ✅ Set up auto-restart on server reboot
- ✅ Optionally configure Nginx reverse proxy
- ✅ Optionally set up webhook for auto-deployment

For detailed deployment options, see **[DEPLOYMENT.md](DEPLOYMENT.md)**

## ✨ Features

### Dashboard Highlights
- **Real-Time Prices** - Live cryptocurrency prices updated every 5 minutes
- **AI Market Predictions** - Hourly bullish/neutral/bearish forecasts with confidence scores
- **Buy/Sell Recommendations** - Data-driven trading signals with reasoning
- **24-Hour Prediction History** - Track prediction accuracy over time
- **Detailed Charts** - Click any crypto for 24h, 7d, 30d, 90d, 6m, 1y, 5y views
- **News Feed** - Latest financial news with sentiment analysis
- **Market Overview** - S&P 500 tracking overall market health

### Automated Data Collection
- **Historical Daily Prices** - Complete price history from January 1, 2020
- **5-Minute Real-Time Data** - Rolling 24-hour window of precise price movements
- **Automatic Updates** - Prices update every 5 minutes via scheduled Edge Functions
- **LiveCoinWatch Integration** - Professional-grade crypto market data
- **Auto-Cleanup** - Maintains optimal database size by removing old intraday data

### Auto-Deployment
- **GitHub Actions** - Automatically deploy when you push to main
- **Webhook Support** - Server pulls changes on every commit
- **Zero-Downtime Updates** - PM2 handles graceful restarts
- **Logging** - Full deployment history and error tracking

### Database Flexibility
- **Supabase** - PostgreSQL with real-time subscriptions and Row Level Security
- **Database Abstraction Layer** - Unified API for all database operations
- **Edge Functions** - Serverless functions for background tasks and API connectors
- **Scheduled Tasks** - Built-in cron jobs via Supabase or GitHub Actions

## 🎯 What You See

### Clean Dashboard With:
- **Overall Market Trend** - AI-powered hourly predictions (Bullish/Neutral/Bearish) with confidence scores
- **Prediction History** - Track last 24 hours of predictions to verify accuracy over time
- **Live Price Grid** - Real-time prices with accurate 24h change for top 10 cryptocurrencies
- **Detailed Crypto Modals** - Click any crypto to see:
  - 24-hour, 7-day, 30-day, 90-day, 6-month, 1-year, and 5-year price charts
  - High/low ranges and volatility metrics
  - Interactive timeline with gradient charts
- **Buy Opportunities** (Green cards) - Cryptos recommended for purchase with confidence %
- **Sell Signals** (Red cards) - Cryptos recommended for selling
- **News Feed** - Latest financial news with sentiment indicators
- **Market Overview** - S&P 500 showing overall market health
- **Smart Auto-Refresh** - Prices every 5 minutes, recommendations every hour, market trends hourly

### Each Recommendation Shows:
- Cryptocurrency symbol and action (BUY/SELL/HOLD)
- Confidence percentage (50-95%)
- Clear reasoning explaining why
- Target price and stop-loss levels

## 🔧 Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL with RLS and Edge Functions)
- **APIs**: LiveCoinWatch (crypto prices), CoinGecko (fallback)
- **Background Tasks**: Supabase Edge Functions (Deno runtime)
- **Deployment**: PM2, Nginx, GitHub Actions
- **Server**: Node.js 20+

## 🎓 How It Works

1. **Automated Data Collection**: Edge Functions fetch crypto prices every 5 minutes from LiveCoinWatch
2. **Historical Database**: Stores daily OHLC prices from 2020 + rolling 24h of 5-minute data
3. **Macro News Collection**: Tracks tariffs, Fed policy, interest rates, inflation, trade wars, geopolitics
4. **Correlation Analysis**: Learns from 5+ years of history which events actually move crypto prices
5. **Pattern Recognition**: Identifies time-lag patterns (how long after news does crypto react)
6. **Predictive Recommendations**: When similar news breaks, predicts response based on historical correlations
7. **Live Updates**: Continuously learning from new data, refreshing predictions hourly

## 📊 Top 10 Cryptos Tracked

Bitcoin (BTC) • Ethereum (ETH) • Tether (USDT) • BNB • Solana (SOL) • USD Coin (USDC) • XRP • Dogecoin (DOGE) • Cardano (ADA) • TRON (TRX)

## 🌐 Data Collection Architecture

### Three Edge Functions Handle Data Collection:

**1. fetch-historical-prices**
- Fetches complete price history from 2020-01-01 to present
- Run once initially, then optionally daily to catch up
- Populates `crypto_daily_prices` table with OHLC data

**2. fetch-5min-prices** 
- Fetches current prices every 5 minutes
- Stores in `crypto_5min_prices` with rolling 24h window
- Updates `crypto_prices` table for real-time dashboard display
- Auto-cleans data older than 24 hours

**3. update-daily-prices**
- Calculates daily OHLC from intraday data
- Runs once per day to update today's daily candle
- Ensures `crypto_daily_prices` stays current

### Scheduling Options:

**Supabase Cron (Recommended)**:
```sql
-- Every 5 minutes
SELECT cron.schedule('update-5min-prices', '*/5 * * * *', ...);

-- Daily at midnight
SELECT cron.schedule('update-daily-prices', '5 0 * * *', ...);
```

**GitHub Actions**: Workflow included at `.github/workflows/update-crypto-prices.yml`

## 🔑 Required API Keys

### LiveCoinWatch (REQUIRED for data collection)
- Sign up: https://www.livecoinwatch.com/tools/api
- Free tier: 10,000 requests/day
- Set as Supabase secret: `LIVECOINWATCH_API_KEY`
- Critical for automated price collection

### NewsAPI (Optional - Real financial news)
- Sign up: https://newsapi.org/register
- 100 requests/day FREE
- Add to .env: `VITE_NEWSAPI_API_KEY=your_key`

### Alpha Vantage (Optional - Real S&P 500)
- Sign up: https://www.alphavantage.co/support/#api-key
- 25 requests/day FREE
- Add to .env: `VITE_ALPHA_VANTAGE_API_KEY=your_key`

## 🔄 Deployment Options

### Option 1: GitHub Actions (Recommended)
Automatically deploys when you push to main branch. See [DEPLOYMENT.md](DEPLOYMENT.md) for setup.

### Option 2: Webhook Listener
Server listens for GitHub webhooks and pulls changes automatically.

### Option 3: Manual Deployment
Use the provided scripts for one-time or scheduled deployments.

## 📁 Project Structure

```
crypto-analytics/
├── .github/
│   └── workflows/
│       ├── deploy.yml                  # GitHub Actions deployment
│       └── update-crypto-prices.yml    # Automated data collection
├── scripts/
│   ├── deploy.sh                       # Server deployment script
│   ├── server-setup.sh                 # One-line server setup
│   └── setup.js                        # Historical data loader
├── supabase/
│   ├── functions/
│   │   ├── fetch-historical-prices/    # Historical data fetcher
│   │   ├── fetch-5min-prices/          # Real-time price updater
│   │   └── update-daily-prices/        # Daily OHLC calculator
│   ├── migrations/                     # Database schema
│   └── sql/
│       └── crypto_helper_queries.sql   # Monitoring & analysis queries
├── src/
│   ├── components/                     # React components
│   ├── lib/
│   │   ├── api/                       # External API integrations
│   │   ├── services/                  # Business logic
│   │   ├── db.ts                      # Database abstraction layer
│   │   └── supabase.ts                # Supabase client
│   └── App.tsx
├── CRYPTO_DATA_SETUP.md               # Data collection setup guide
├── DEPLOYMENT.md                       # Comprehensive deployment guide
├── ecosystem.config.js                 # PM2 configuration
├── .env.example                       # Environment template
└── README.md                          # You are here
```

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Optional API Keys (for enhanced features)
VITE_NEWSAPI_API_KEY=your_key
VITE_ALPHA_VANTAGE_API_KEY=your_key
```

**Note**: `LIVECOINWATCH_API_KEY` is set as a Supabase secret for Edge Functions, not in .env

## 🚨 Important Notes

⚠️ **Not Financial Advice**
- This is an analytical tool for educational purposes
- Always do your own research
- Past performance ≠ future results

✅ **100% Real Data**
- All cryptocurrency prices are live from LiveCoinWatch API
- **Historical data**: Daily OHLC prices from January 1, 2020
- **Real-time data**: 5-minute price updates for past 24 hours
- **Multi-timeframe charts**: 24h, 7d, 30d, 90d, 6m, 1y, 5y views
- **Automated collection**: Edge Functions running every 5 minutes
- **Auto-cleanup**: Maintains optimal database size
- No simulated, demo, or fake data ever

## 🔐 Security

- Never commit `.env` files
- Store API keys as Supabase secrets for Edge Functions
- Use Row Level Security (RLS) for database access control
- Enable database connection encryption
- Keep dependencies updated
- Use HTTPS/SSL in production

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

For issues, questions, or deployment help, see:
- [CRYPTO_DATA_SETUP.md](CRYPTO_DATA_SETUP.md) - Complete data collection guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment instructions
- [GitHub Issues](https://github.com/joachimriise/Crypto_Analytics/issues) - Report bugs or request features

---

**Built with ❤️ for crypto traders and developers**
