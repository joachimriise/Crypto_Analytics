# Crypto Analytics Engine - Project Overview

## What This Application Does

This is a real-world crypto market prediction system that analyzes correlations between global events, traditional markets, and cryptocurrency prices to generate actionable BUY/SELL/HOLD recommendations.

## Key Features

### 1. Multi-Source Data Integration
- **Crypto Prices:** Real-time and historical data for top 10 cryptocurrencies (BTC, ETH, BNB, SOL, XRP, ADA, DOGE, MATIC, AVAX, DOT)
- **Traditional Markets:** S&P 500 index tracking to correlate crypto movements with stock market trends
- **Financial News:** Automated collection of news about tariffs, regulations, Fed policy, and crypto events
- **Social Media Events:** Manual tracking of influential posts (Trump, Musk, etc.)

### 2. Intelligent Analysis Engine
- **Sentiment Analysis:** Automatically scores news articles as positive/negative/neutral
- **Event Categorization:** Classifies events (tariff, regulation, adoption, security, Fed policy, political, tech, market)
- **Impact Assessment:** Determines if events are high, medium, or low impact
- **Pattern Recognition:** Identifies historical correlations between events and price movements

### 3. Recommendation System
- **BUY Signals:** Generated when multiple positive indicators align
- **SELL Signals:** Triggered by negative news, market conditions, or price patterns
- **HOLD Recommendations:** Suggested when market conditions are unclear
- **Confidence Scoring:** Each recommendation includes a confidence percentage (50-95%)
- **Price Targets:** BUY recommendations include target prices and stop-loss levels

### 4. Real-Time Dashboard
- **Live Prices:** Current cryptocurrency prices updated every 5 minutes
- **Active Recommendations:** Color-coded cards showing BUY (green), SELL (red), and HOLD (amber) signals
- **News Feed:** Latest financial news with sentiment indicators
- **Market Overview:** S&P 500 index showing overall market conditions
- **Auto-Refresh:** Automatic data collection and recommendation updates

### 5. Historical Data & Backtesting
- **5-Year Backfill:** Capability to load historical data from 2020-2025
- **Pattern Library:** Stores identified correlations for future reference
- **Accuracy Tracking:** Measures recommendation success rate over time
- **Case Studies:** Review major historical events (like Trump's tariff announcement)

## How It Works

### Data Flow - Automatic Operation
1. **First Load:** Dashboard detects empty database and automatically fetches initial data
2. **Collection:** APIs fetch data from CoinGecko (always free, no key needed)
3. **Storage:** All data stored in Supabase database with timestamps
4. **Analysis:** Sentiment analyzer processes news and categorizes events
5. **Recommendations:** Engine combines multiple signals to generate buy/sell/hold advice
6. **Display:** Dashboard presents actionable recommendations to users
7. **Auto-Refresh:** Every 5 minutes, steps 2-6 repeat automatically

### Recommendation Logic
The system analyzes:
- **News Sentiment:** Recent articles weighted by impact level
- **Price Momentum:** 24-hour and 7-day price changes
- **Market Conditions:** S&P 500 trends indicating overall market health
- **High-Impact Events:** Special weight given to major news (tariffs, Fed policy, regulations)

Signals are combined with weighted scoring to produce final recommendations with confidence levels.

## Technology Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **APIs:** CoinGecko, Alpha Vantage, NewsAPI
- **Build Tool:** Vite
- **Icons:** Lucide React

## Database Schema

- `crypto_prices` - OHLCV data for all tracked cryptocurrencies
- `news_events` - Financial and political news with sentiment scores
- `market_indices` - Traditional market data (S&P 500, etc.)
- `social_media_events` - Major social media posts from influential figures
- `correlation_patterns` - Identified relationships between events and price movements
- `recommendations` - Generated buy/sell/hold signals with reasoning
- `recommendation_outcomes` - Tracks accuracy of past recommendations
- `api_usage_logs` - Monitors API calls to stay within rate limits

## Rate Limiting

Built-in rate limiter ensures compliance with free API tier limits:
- CoinGecko: 30 calls/min, 10k/month
- Alpha Vantage: 5 calls/min, 500/day
- NewsAPI: 100 calls/day

## Use Cases

### For Traders
- Get AI-powered recommendations based on historical patterns
- Understand why recommendations are made through detailed reasoning
- Set target prices and stop-loss levels for risk management

### For Analysts
- Study correlations between global events and crypto price movements
- Analyze sentiment trends in financial news
- Backtest strategies against 5 years of historical data

### For Researchers
- Explore the psychology of crypto market reactions to news
- Identify predictable patterns in market behavior
- Test hypotheses about event-driven price movements

## Example Scenario

**Event:** Trump announces tariffs on China via social media
**System Response:**
1. News API detects relevant articles
2. Sentiment analyzer scores as negative with high impact
3. Historical pattern matcher finds similar past tariff announcements
4. Price data shows typical 10-20% drop following such events
5. Recommendation engine generates SELL signals for affected cryptos
6. Dashboard displays alerts with confidence scores and reasoning

## Getting Started

1. Set up API keys (see API_SETUP.md)
2. Run the development server
3. Use Admin Panel to collect initial data
4. Generate first recommendations
5. Monitor dashboard for actionable signals

## Future Enhancements

- Machine learning models for better prediction accuracy
- Automated trading integration
- Email/SMS alerts for urgent recommendations
- Mobile app for on-the-go monitoring
- Advanced charting with technical indicators
- Community sentiment from Reddit/Twitter API
