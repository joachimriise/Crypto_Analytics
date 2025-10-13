# Crypto Analytics Engine

Correlation analysis system that learns how macro events affect crypto prices and predicts market response to breaking news.

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in minutes
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
- **Real-Time Prices** - Live cryptocurrency prices updated every minute
- **AI Market Predictions** - Hourly bullish/neutral/bearish forecasts with confidence scores
- **Buy/Sell Recommendations** - Data-driven trading signals with reasoning
- **24-Hour Prediction History** - Track prediction accuracy over time
- **Detailed Charts** - Click any crypto for 24h, 7d, 30d, 90d, 6m, 1y, 5y views
- **News Feed** - Latest financial news with sentiment analysis
- **Market Overview** - S&P 500 tracking overall market health

### Auto-Deployment
- **GitHub Actions** - Automatically deploy when you push to main
- **Webhook Support** - Server pulls changes on every commit
- **Zero-Downtime Updates** - PM2 handles graceful restarts
- **Logging** - Full deployment history and error tracking

### Database Flexibility
- **Multi-Database Support** - Easy switching between Supabase, PostgreSQL, MySQL, MongoDB
- **Database Abstraction Layer** - Unified API for all database operations
- **Migration Tools** - Seamless database transitions

## 🎯 What You See

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

## 🔧 Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL with RLS) - easily switchable
- **APIs**: CoinGecko (real-time prices, free)
- **Deployment**: PM2, Nginx, GitHub Actions
- **Server**: Node.js 20+

## 🎓 How It Works

1. **Real Live Data**: Fetches current prices from CoinGecko API (100% real, no demo data)
2. **Macro News Collection**: Tracks tariffs, Fed policy, interest rates, inflation, trade wars, geopolitics, oil prices, sanctions
3. **Correlation Analysis**: Learns from 5 years of history which events actually move crypto prices
4. **Pattern Recognition**: Identifies time-lag patterns (how long after news does crypto react)
5. **Predictive Recommendations**: When similar news breaks, predicts response based on historical correlations
6. **Live Updates**: Refreshes every 5 minutes, continuously learning from new data

## 📊 Top 10 Cryptos Tracked

Bitcoin (BTC) • Ethereum (ETH) • BNB • Solana (SOL) • XRP • Cardano (ADA) • Dogecoin (DOGE) • Polygon (MATIC) • Avalanche (AVAX) • Polkadot (DOT)

## 🌐 Optional: Enhanced Data

Get free API keys for the best experience:

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
│       └── deploy.yml          # GitHub Actions deployment
├── scripts/
│   ├── deploy.sh              # Server deployment script
│   ├── server-setup.sh        # One-line server setup
│   └── setup.js               # Historical data loader
├── src/
│   ├── components/            # React components
│   ├── lib/
│   │   ├── api/              # External API integrations
│   │   ├── services/         # Business logic
│   │   ├── db.ts             # Database abstraction layer
│   │   └── supabase.ts       # Supabase client
│   └── App.tsx
├── DEPLOYMENT.md              # Comprehensive deployment guide
├── ecosystem.config.js        # PM2 configuration
├── .env.example              # Environment template
└── README.md                 # You are here
```

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database Provider (supabase, postgres, mysql, mongodb)
VITE_DB_PROVIDER=supabase

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Optional API Keys
VITE_LIVECOINWATCH_API_KEY=your_key
VITE_NEWSAPI_API_KEY=your_key
VITE_ALPHA_VANTAGE_API_KEY=your_key
```

## 🚨 Important Notes

⚠️ **Not Financial Advice**
- This is an analytical tool for educational purposes
- Always do your own research
- Past performance ≠ future results

✅ **100% Real Data**
- All cryptocurrency prices are live from CoinGecko/LiveCoinWatch APIs
- **Live data**: One price every minute for past 24 hours
- **Historical data**: One price per day since January 1, 2020
- **Multi-timeframe charts**: 24h, 7d, 30d, 90d, 6m, 1y, 5y views
- Auto-cleanup: Live data older than 24 hours is removed
- No simulated, demo, or fake data ever

## 🔐 Security

- Never commit `.env` files
- Use SSH keys for deployment
- Enable database connection encryption
- Keep dependencies updated
- Use HTTPS/SSL in production

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

For issues, questions, or deployment help, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment instructions
- [GitHub Issues](https://github.com/joachimriise/Crypto_Analytics/issues) - Report bugs or request features

---

**Built with ❤️ for crypto traders and developers**
