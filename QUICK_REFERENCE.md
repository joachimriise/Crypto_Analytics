# Quick Reference Guide

## 🚀 Deployment Commands

### One-Time Server Setup
```bash
# SSH into your server first, then run:
curl -fsSL https://raw.githubusercontent.com/joachimriise/Crypto_Analytics/main/scripts/server-setup.sh | bash
```

### Manual Deployment
```bash
# On your server:
cd /var/www/crypto-analytics
git pull origin main
npm ci
npm run build
pm2 restart crypto-analytics
```

### PM2 Commands
```bash
pm2 start ecosystem.config.js --env production  # Start app
pm2 restart crypto-analytics                    # Restart app
pm2 stop crypto-analytics                       # Stop app
pm2 delete crypto-analytics                     # Remove from PM2
pm2 logs crypto-analytics                       # View logs
pm2 logs crypto-analytics --lines 100           # View last 100 lines
pm2 monit                                       # Monitor all apps
pm2 status                                      # View all apps status
pm2 save                                        # Save current process list
pm2 startup                                     # Setup startup script
```

## 🔧 Database Commands

### Using the Database Abstraction Layer
```typescript
import { db } from './lib/db';

// Insert
const coin = await db.insert('coins', {
  symbol: 'BTC',
  name: 'Bitcoin',
  price: 50000
});

// Update
await db.update('coins', coin.id, { price: 51000 });

// Find one
const btc = await db.findOne('coins', coin.id);

// Find many
const allCoins = await db.findMany('coins');
const expensiveCoins = await db.findMany('coins', { price: '>50000' });

// Delete
await db.delete('coins', coin.id);
```

### Switching Database Providers
Edit `.env`:
```env
# Use Supabase
VITE_DB_PROVIDER=supabase
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# OR use PostgreSQL
VITE_DB_PROVIDER=postgres
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=crypto_analytics
VITE_DB_USER=postgres
VITE_DB_PASSWORD=your_password
```

## 🐛 Troubleshooting

### Deployment Fails
```bash
# Check GitHub Actions logs
# Go to: https://github.com/joachimriise/Crypto_Analytics/actions

# Check server logs
pm2 logs crypto-analytics

# Verify SSH connection
ssh user@your-server

# Check disk space
df -h

# Check file permissions
ls -la /var/www/crypto-analytics
```

### App Won't Start
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs crypto-analytics --err

# Restart PM2
pm2 restart crypto-analytics

# Or delete and recreate
pm2 delete crypto-analytics
pm2 start ecosystem.config.js --env production

# Check Node version
node --version  # Should be 20+
```

### Database Connection Issues
```bash
# Verify environment variables
cat /var/www/crypto-analytics/.env

# Test database connection (PostgreSQL)
psql -h localhost -U postgres -d crypto_analytics

# Check Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm cache clean --force

# Update dependencies
npm update
```

## 📝 GitHub Actions Setup

### Required Secrets
Add these in GitHub: `Settings` → `Secrets and variables` → `Actions`

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SERVER_HOST` | Server IP or domain | `192.168.1.100` |
| `SERVER_USER` | SSH username | `ubuntu` |
| `SERVER_SSH_KEY` | Private SSH key | `-----BEGIN...` |
| `SERVER_PORT` | SSH port | `22` |
| `DEPLOY_PATH` | App directory | `/var/www/crypto-analytics` |
| `VITE_SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase key | `eyJ...` |

### Generate SSH Key
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server

# Copy private key to GitHub Secrets
cat ~/.ssh/id_ed25519
```

## 🔄 Webhook Setup

### Install Webhook Listener
```bash
# On server
sudo apt-get install webhook

# Create hooks config
sudo nano /var/scripts/hooks.json
```

### Configure GitHub Webhook
1. Go to: `Settings` → `Webhooks` → `Add webhook`
2. Payload URL: `http://your-server:9000/hooks/deploy-crypto-analytics`
3. Content type: `application/json`
4. Secret: Your webhook secret
5. Events: Just the push event
6. Active: ✓

### Start Webhook Service
```bash
sudo systemctl start webhook
sudo systemctl enable webhook
sudo systemctl status webhook
```

## 📊 Monitoring

### Check App Health
```bash
# View running processes
pm2 status

# Monitor in real-time
pm2 monit

# Check system resources
htop

# Check disk usage
df -h

# Check memory
free -h
```

### View Logs
```bash
# Application logs
pm2 logs crypto-analytics

# Deployment logs
tail -f /var/log/crypto-deploy.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u webhook -f
```

## 🔐 Security Checklist

- [ ] Use SSH keys (not passwords)
- [ ] Disable root SSH login
- [ ] Enable firewall (ufw)
- [ ] Use HTTPS/SSL certificates
- [ ] Restrict SSH to specific IPs
- [ ] Keep system updated
- [ ] Use strong database passwords
- [ ] Enable database encryption
- [ ] Backup database regularly
- [ ] Monitor logs for suspicious activity

## 🔄 Update Workflow

### Development
```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main
```

### Automatic (GitHub Actions)
- Push triggers automatic deployment
- Check Actions tab for status
- App automatically restarts on server

### Manual
```bash
# SSH to server
ssh user@server

# Pull changes
cd /var/www/crypto-analytics
git pull origin main

# Build and restart
npm ci
npm run build
pm2 restart crypto-analytics
```

## 📞 Getting Help

### Check Logs First
```bash
pm2 logs crypto-analytics --lines 100
tail -n 100 /var/log/crypto-deploy.log
```

### Common Issues
- **504 Gateway Timeout**: Check if app is running (`pm2 status`)
- **502 Bad Gateway**: Check Nginx config and restart (`sudo nginx -t && sudo systemctl restart nginx`)
- **Build Failed**: Clear cache and reinstall (`rm -rf node_modules && npm install`)
- **Database Connection**: Verify `.env` file and database credentials

### Resources
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [GitHub Issues](https://github.com/joachimriise/Crypto_Analytics/issues) - Report bugs
- [PM2 Documentation](https://pm2.keymetrics.io/) - Process manager docs
- [Nginx Documentation](https://nginx.org/en/docs/) - Web server docs

## 🎯 Quick Wins

### Improve Performance
```bash
# Enable PM2 cluster mode
pm2 start ecosystem.config.js --env production -i max

# Enable Nginx caching
# Add to nginx config:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;
proxy_cache my_cache;
```

### Enable SSL
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Setup Automatic Backups
```bash
# Create backup script
sudo nano /var/scripts/backup.sh

# Add to crontab
sudo crontab -e
0 2 * * * /var/scripts/backup.sh
```

---

**Need more help?** Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides!
