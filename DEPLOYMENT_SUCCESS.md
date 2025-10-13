# 🎉 Deployment Complete!

Your Crypto Analytics app is now live at: **http://crypto.brandbuilder.no:3000**

## ✅ What's Currently Running

- **Application**: Crypto Analytics Dashboard
- **URL**: http://crypto.brandbuilder.no:3000
- **Process Manager**: PM2
- **User**: cryptobrandbuilderno (no sudo required)
- **Location**: `/home/cryptobrandbuilderno/www/Crypto_Analytics`
- **Port**: 3000
- **Status**: ✅ Online

## 🔄 Auto-Deployment Setup

To enable automatic deployment when you push to GitHub, follow these steps:

### 1. Generate SSH Key for GitHub Actions

On your server, run:
```bash
# Generate new SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Add public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key (you'll need to copy this)
cat ~/.ssh/github_actions
```

### 2. Add Secrets to GitHub

Go to: https://github.com/joachimriise/Crypto_Analytics/settings/secrets/actions

Click **"New repository secret"** and add each of these:

| Secret Name | Value | How to Get It |
|------------|-------|---------------|
| `SERVER_HOST` | `crypto.brandbuilder.no` | Your domain |
| `SERVER_USER` | `cryptobrandbuilderno` | Your username |
| `SERVER_SSH_KEY` | (Your private key) | Output from `cat ~/.ssh/github_actions` |
| `SERVER_PORT` | `22` | Your SSH port |
| `DEPLOY_PATH` | `/home/cryptobrandbuilderno/www/Crypto_Analytics` | Your app path |
| `VITE_SUPABASE_URL` | (Your Supabase URL) | From your `.env` file |
| `VITE_SUPABASE_ANON_KEY` | (Your Supabase key) | From your `.env` file |

### 3. Test Auto-Deployment

Once you've added all the secrets:

1. Make a small change to any file (like the README)
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "Test auto-deployment"
   git push origin main
   ```
3. Watch the deployment in GitHub Actions: https://github.com/joachimriise/Crypto_Analytics/actions

Within 2-3 minutes, your changes will be live on the server!

## 📝 Manual Deployment (If Needed)

If you prefer to deploy manually or if auto-deployment isn't set up yet:

```bash
# SSH to your server
cd ~/www/Crypto_Analytics

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild the app
npm run build

# Restart PM2
pm2 restart crypto-analytics

# Check status
pm2 status
```

## 🛠️ Useful PM2 Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs crypto-analytics

# View last 100 log lines
pm2 logs crypto-analytics --lines 100

# Restart app
pm2 restart crypto-analytics

# Stop app
pm2 stop crypto-analytics

# Monitor resources
pm2 monit

# Clear old logs
pm2 flush
```

## 🔍 Troubleshooting

### App not responding?
```bash
pm2 status
pm2 logs crypto-analytics --lines 50
pm2 restart crypto-analytics
```

### Port already in use?
```bash
# Check what's using port 3000
lsof -i :3000

# Or use a different port
pm2 delete crypto-analytics
pm2 start "serve -s dist -l 3001" --name crypto-analytics
pm2 save
```

### After git pull, changes not showing?
```bash
npm run build
pm2 restart crypto-analytics
```

### Check if app is accessible
```bash
curl http://localhost:3000
```

## 🌐 Optional: Remove Port from URL

Currently users need to visit: `http://crypto.brandbuilder.no:3000`

To make it accessible at: `http://crypto.brandbuilder.no` (without :3000)

Ask your server admin to add this Nginx reverse proxy configuration:

```nginx
server {
    listen 80;
    server_name crypto.brandbuilder.no;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 🔐 Optional: Add SSL/HTTPS

For secure HTTPS access, ask your admin to install Let's Encrypt:

```bash
sudo certbot --nginx -d crypto.brandbuilder.no
```

This will make your site accessible at: `https://crypto.brandbuilder.no`

## 📊 Database Configuration

Your app is currently using Supabase. The configuration is in your `.env` file:

```bash
# View current database config
cat ~/www/Crypto_Analytics/.env
```

To change databases, edit the `.env` file and restart:
```bash
nano ~/www/Crypto_Analytics/.env
# Edit VITE_DB_PROVIDER and related credentials
pm2 restart crypto-analytics
```

## 🎯 Next Steps

1. ✅ **App is running** - Visit http://crypto.brandbuilder.no:3000
2. 🔄 **Set up auto-deployment** - Add GitHub Secrets (see above)
3. 🌐 **Remove port from URL** - Ask admin to configure Nginx
4. 🔐 **Add SSL** - Ask admin to install Let's Encrypt certificate
5. 📧 **Configure alerts** - Set up PM2 monitoring (optional)

## 💡 Tips

- **Always commit changes**: Use git for version control
- **Test locally first**: Run `npm run dev` before pushing
- **Monitor logs**: Use `pm2 logs` to catch errors early
- **Keep dependencies updated**: Run `npm update` occasionally
- **Backup database**: Regular backups of Supabase data

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Command reference
- [README.md](./README.md) - Project overview

## 🆘 Need Help?

- Check logs: `pm2 logs crypto-analytics`
- Review documentation in this repository
- Check GitHub Actions logs: https://github.com/joachimriise/Crypto_Analytics/actions

---

**Congratulations! Your Crypto Analytics app is live! 🚀**
