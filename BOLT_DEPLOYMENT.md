# Deploying to Bolt.new + Supabase

Modern serverless deployment with zero server management!

## 🌟 Why This Approach?

**Old Way** (Your current server):
- ❌ Manual server setup
- ❌ PM2 process management
- ❌ Nginx configuration
- ❌ SSH access needed
- ❌ Manual deployments

**New Way** (Bolt.new + Supabase):
- ✅ Zero server management
- ✅ Auto-deploy on git push
- ✅ Global CDN
- ✅ Automatic SSL
- ✅ Free tier available
- ✅ Edge functions for serverless compute

---

## 📋 Step-by-Step Setup

### 1. Set Up Supabase (5 minutes)

1. **Create Account**
   - Go to https://supabase.com
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Name: `crypto-analytics`
   - Database Password: (generate strong password)
   - Region: Choose closest to your users
   - Click "Create project" (takes ~2 minutes)

3. **Create Database Schema**
   - Go to SQL Editor
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and click "Run"
   - You should see: "Database schema created successfully!"

4. **Get API Keys**
   - Go to Settings → API
   - Copy:
     - Project URL: `https://xxxxx.supabase.co`
     - `anon` `public` key: `eyJhbG...`
   - Save these for next step!

---

### 2. Deploy to Bolt.new (3 minutes)

#### Option A: Deploy from Bolt.new Dashboard

1. **Go to Bolt.new**
   - Visit https://bolt.new
   - Sign in with GitHub

2. **Import Repository**
   - Click "New Project"
   - Select "Import from GitHub"
   - Choose `joachimriise/Crypto_Analytics`
   - Click "Import"

3. **Configure Environment Variables**
   - Go to Project Settings → Environment
   - Add these variables:
     ```
     VITE_SUPABASE_URL=https://xxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbG...your-key...
     VITE_LIVECOINWATCH_API_KEY=your-key (optional)
     VITE_NEWSAPI_API_KEY=your-key (optional)
     VITE_ALPHA_VANTAGE_API_KEY=your-key (optional)
     ```

4. **Deploy**
   - Click "Deploy"
   - Bolt will build and deploy automatically
   - Your site will be live at: `your-project.bolt.new`

#### Option B: Deploy with Bolt CLI (Alternative)

```bash
# Install Bolt CLI
npm install -g @bolt/cli

# Login
bolt login

# Deploy
cd ~/www/Crypto_Analytics
bolt deploy

# Follow prompts to add environment variables
```

---

### 3. Set Up Auto-Deployment (2 minutes)

Every time you push to GitHub, Bolt automatically redeploys!

**That's it!** No GitHub Actions needed - Bolt watches your repo.

To test:
```bash
# Make a change
echo "# Test deployment" >> README.md
git add .
git commit -m "Test Bolt auto-deploy"
git push origin main

# Watch deployment at: https://bolt.new/dashboard
# Your site updates automatically in ~30 seconds!
```

---

### 4. Connect Custom Domain (Optional)

1. **In Bolt.new**
   - Go to Project Settings → Domains
   - Click "Add Custom Domain"
   - Enter: `crypto.brandbuilder.no`

2. **Update DNS**
   - Add CNAME record:
     ```
     crypto.brandbuilder.no → your-project.bolt.new
     ```
   - Or A record if Bolt provides IP

3. **SSL Certificate**
   - Automatic! Bolt handles this for you

---

## 🚀 Using Supabase Edge Functions (Advanced)

For server-side logic (API calls, scheduled jobs), use Supabase Edge Functions:

### Example: Scheduled Price Fetcher

Create `supabase/functions/fetch-prices/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Fetch crypto prices from CoinGecko
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
  )
  const prices = await response.json()

  // Save to Supabase
  await supabase.from('live_prices').insert({
    symbol: 'BTC',
    name: 'Bitcoin',
    price: prices.bitcoin.usd,
    timestamp: new Date().toISOString()
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Deploy edge function:
```bash
npx supabase functions deploy fetch-prices
```

Schedule with Supabase Cron:
```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'fetch-prices-every-5-min',
  '*/5 * * * *',
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/fetch-prices'',
    headers:=''{"Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb
  );'
);
```

---

## 📊 Comparison: Bolt vs Your Server

| Feature | Your Server | Bolt.new |
|---------|-------------|----------|
| **Setup Time** | 30+ minutes | 5 minutes |
| **Deploy Method** | SSH + Scripts | Git push |
| **SSL/HTTPS** | Manual (Certbot) | Automatic |
| **Scaling** | Manual | Automatic |
| **CDN** | Need Cloudflare | Built-in |
| **Cost** | Server costs | Free tier |
| **Maintenance** | You manage | Bolt manages |
| **Downtime** | Manual restarts | Zero-downtime |

---

## 💰 Pricing

### Supabase
- **Free Tier**: 500MB database, 2GB bandwidth, 50K API requests/month
- **Pro**: $25/month - 8GB database, 250GB bandwidth, unlimited requests
- Perfect for crypto analytics!

### Bolt.new
- **Free Tier**: Unlimited projects, auto-deploy, SSL
- **Pro**: $20/month - Custom domains, more build minutes
- Check current pricing at https://bolt.new/pricing

**Total for hobby project**: $0/month (free tiers) ✅

---

## 🔄 Migration from Your Server

### Quick Migration

1. **Deploy to Bolt** (follow steps above)
2. **Test new deployment** at `your-project.bolt.new`
3. **Update DNS** to point `crypto.brandbuilder.no` to Bolt
4. **Turn off old server** when ready

No data migration needed - just reconfigure!

---

## 🛠️ Development Workflow

### Local Development
```bash
cd ~/www/Crypto_Analytics
npm run dev
# App runs at http://localhost:5173
```

### Push to Deploy
```bash
git add .
git commit -m "New feature"
git push origin main
# Bolt auto-deploys in ~30 seconds!
```

### View Logs
- Bolt Dashboard → Deployments → View Logs
- Supabase Dashboard → Logs

---

## ✅ Benefits Summary

**For You:**
- ✅ No more SSH/server management
- ✅ Automatic HTTPS
- ✅ Auto-deploys on git push  
- ✅ Free hosting (Bolt free tier)
- ✅ Free database (Supabase free tier)
- ✅ Built-in CDN
- ✅ Zero-downtime deployments

**For Your Users:**
- ✅ Faster loading (CDN)
- ✅ Better uptime
- ✅ Global availability

---

## 🤔 Should You Switch?

**Switch to Bolt.new if:**
- ✅ You want simpler deployment
- ✅ You don't want to manage servers
- ✅ You want automatic SSL/CDN
- ✅ You want git-push-to-deploy

**Keep your server if:**
- ❌ You need full control
- ❌ You have complex backend requirements
- ❌ You prefer self-hosting

---

## 📞 Next Steps

1. Set up Supabase (5 min)
2. Deploy to Bolt (3 min)
3. Test at `your-project.bolt.new`
4. Update DNS when ready
5. Turn off old server

**Ready to get started?** Begin with Supabase setup!
