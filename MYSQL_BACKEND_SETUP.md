# MySQL Backend Setup Guide

This guide explains how to run Crypto Analytics with a local MySQL database instead of Supabase.

## Architecture

```
Browser (React Frontend) → Express API Server (Port 3001) → MySQL Database
                          ↓
                    Static Files (Port 80/443 via Nginx)
```

## Why Do We Need a Backend?

**Browsers cannot connect directly to MySQL** for security reasons. We need an API server that:
- Runs on your server (Node.js/Express)
- Connects to MySQL database
- Exposes REST API endpoints
- Your React app calls these endpoints

## Setup Steps

### 1. Pull Latest Code

```bash
cd ~/www/Crypto_Analytics
git pull origin main
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web server framework
- `mysql2` - MySQL driver
- `cors` - Allow frontend to call API
- `dotenv` - Environment variable management

### 3. Create MySQL Tables

```bash
mysql -u cryptobrandbuilderno -p cryptobrandbuilderno << 'EOF'
CREATE TABLE IF NOT EXISTS historical_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_price (symbol, timestamp),
    INDEX idx_symbol (symbol),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS live_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    change_24h DECIMAL(10, 2),
    volume_24h DECIMAL(20, 2),
    market_cap DECIMAL(20, 2),
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    reasoning TEXT NOT NULL,
    target_price DECIMAL(20, 8),
    stop_loss DECIMAL(20, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS market_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trend VARCHAR(20) NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    reasoning TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
EOF
```

### 4. Configure Environment

```bash
cd ~/www/Crypto_Analytics
nano .env
```

Add these settings:

```env
# API Server Port
API_PORT=3001

# MySQL Database
VITE_DB_HOST=localhost
VITE_DB_PORT=3306
VITE_DB_NAME=cryptobrandbuilderno
VITE_DB_USER=cryptobrandbuilderno
VITE_DB_PASSWORD=your_mysql_password

# API Base URL (for frontend to call backend)
VITE_API_BASE_URL=http://localhost:3001/api

# External APIs (optional)
VITE_LIVECOINWATCH_API_KEY=your_key
VITE_NEWSAPI_API_KEY=your_key
VITE_ALPHA_VANTAGE_API_KEY=your_key
```

### 5. Start the API Server

```bash
cd ~/www/Crypto_Analytics

# Start API server with PM2
pm2 start server/index.js --name crypto-api

# Save PM2 config
pm2 save

# Check if it's running
pm2 status
pm2 logs crypto-api
```

You should see:
```
✅ Connected to MySQL database
🚀 API server running on http://localhost:3001
```

### 6. Test API Endpoints

```bash
# Test health check
curl http://localhost:3001/api/health

# Test database connection
curl http://localhost:3001/api/prices/live
```

### 7. Build and Deploy Frontend

```bash
cd ~/www/Crypto_Analytics

# Build the React app
npm run build

# Deploy to web root
rm -rf ~/www/*
cp -r dist/* ~/www/
```

### 8. Update PM2 Ecosystem Config

Edit `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'crypto-api',
      script: 'server/index.js',
      cwd: '/home/cryptobrandbuilderno/www/Crypto_Analytics',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        API_PORT: 3001
      }
    }
  ]
};
```

Start with:
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

## API Endpoints

### Prices
- `GET /api/prices/live` - Get all live prices
- `POST /api/prices/live` - Insert live price
- `GET /api/prices/historical/:symbol?days=30` - Get historical prices
- `POST /api/prices/historical` - Insert historical price
- `DELETE /api/prices/live/cleanup?hours=24` - Cleanup old prices

### Recommendations
- `GET /api/recommendations` - Get all recommendations
- `POST /api/recommendations` - Insert recommendation

### Predictions
- `GET /api/predictions` - Get market predictions
- `POST /api/predictions` - Insert prediction

### Health
- `GET /api/health` - Check if API is running

## Troubleshooting

### API won't start

```bash
# Check logs
pm2 logs crypto-api

# Check if port 3001 is available
lsof -i :3001

# Restart API
pm2 restart crypto-api
```

### Database connection errors

```bash
# Test MySQL connection
mysql -u cryptobrandbuilderno -p cryptobrandbuilderno

# Check credentials in .env
cat ~/www/Crypto_Analytics/.env
```

### Frontend can't reach API

```bash
# Make sure API is running
pm2 status

# Test API endpoint
curl http://localhost:3001/api/health

# Check VITE_API_BASE_URL in .env
```

### PM2 issues

```bash
# Delete and recreate
pm2 delete crypto-api
pm2 start server/index.js --name crypto-api
pm2 save
```

## Production Deployment

When pushing to GitHub, the deployment workflow will:
1. Build the frontend
2. Copy files to ~/www/
3. Restart PM2 processes (if configured)

Make sure your `.github/workflows/deploy.yml` includes:

```yaml
script: |
  cd ${{ secrets.DEPLOY_PATH }}
  git pull origin main
  npm ci
  npm run build
  rm -rf ~/www/*
  cp -r dist/* ~/www/
  pm2 restart crypto-api || pm2 start server/index.js --name crypto-api
  pm2 save
```

## Why This Approach?

**Pros:**
- ✅ Full control over your data
- ✅ No external database costs
- ✅ Fast local queries
- ✅ Works with MySQL

**Cons:**
- ❌ More complex setup (need backend server)
- ❌ Need to manage two processes (frontend + API)
- ❌ More code to maintain

**Alternative: Keep using Supabase**
- Simpler architecture (no backend needed)
- Free tier available
- Already working in your app
- Just need to add credentials to .env

Your choice! Both approaches work well.
