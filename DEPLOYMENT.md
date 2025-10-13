# Deployment & Database Setup Guide

This guide covers setting up auto-deployment from GitHub and connecting to a new database.

## Table of Contents
1. [Auto-Deployment Setup](#auto-deployment-setup)
2. [Database Migration](#database-migration)
3. [Environment Configuration](#environment-configuration)

---

## Auto-Deployment Setup

### Option 1: GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow that automatically deploys when you push to the main branch.

#### Prerequisites
- Server with SSH access
- Node.js 20+ installed on server
- PM2 installed globally: `npm install -g pm2`

#### Setup Steps

1. **Add GitHub Secrets**
   
   Go to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`
   
   Add these secrets:
   - `SERVER_HOST`: Your server IP or domain (e.g., `192.168.1.100` or `example.com`)
   - `SERVER_USER`: SSH username (e.g., `ubuntu`, `root`)
   - `SERVER_SSH_KEY`: Your private SSH key (entire content of `~/.ssh/id_rsa`)
   - `SERVER_PORT`: SSH port (default: `22`)
   - `DEPLOY_PATH`: Full path where app is deployed (e.g., `/var/www/crypto-analytics`)
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

2. **Generate SSH Key (if needed)**
   
   On your local machine:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions"
   ```
   
   Copy the public key to your server:
   ```bash
   ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server
   ```
   
   Copy the private key content to GitHub Secrets:
   ```bash
   cat ~/.ssh/id_ed25519
   ```

3. **Prepare Your Server**
   
   SSH into your server and run:
   ```bash
   # Create deployment directory
   mkdir -p /var/www/crypto-analytics
   cd /var/www/crypto-analytics
   
   # Clone repository
   git clone https://github.com/joachimriise/Crypto_Analytics.git .
   
   # Install dependencies
   npm install
   
   # Create .env file
   nano .env
   ```
   
   Add your environment variables to `.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```
   
   ```bash
   # Build the app
   npm run build
   
   # Setup PM2 to serve the built files
   npm install -g serve pm2
   pm2 start "serve -s dist -l 3000" --name crypto-analytics
   pm2 save
   pm2 startup
   ```

4. **Setup Nginx (Optional but Recommended)**
   
   ```bash
   sudo nano /etc/nginx/sites-available/crypto-analytics
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable and restart:
   ```bash
   sudo ln -s /etc/nginx/sites-available/crypto-analytics /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Test Deployment**
   
   Push a change to the main branch and check the Actions tab in GitHub.

---

### Option 2: Webhook-Based Auto-Deployment

If you prefer server-side control, use a webhook listener.

#### Setup Steps

1. **Create Deployment Script on Server**
   
   ```bash
   mkdir -p /var/scripts
   nano /var/scripts/deploy-crypto-analytics.sh
   ```
   
   Add:
   ```bash
   #!/bin/bash
   
   DEPLOY_DIR="/var/www/crypto-analytics"
   LOG_FILE="/var/log/crypto-deploy.log"
   
   echo "$(date): Starting deployment" >> $LOG_FILE
   
   cd $DEPLOY_DIR
   
   # Pull latest changes
   git pull origin main >> $LOG_FILE 2>&1
   
   # Install dependencies
   npm ci >> $LOG_FILE 2>&1
   
   # Build application
   npm run build >> $LOG_FILE 2>&1
   
   # Restart PM2
   pm2 restart crypto-analytics >> $LOG_FILE 2>&1
   
   echo "$(date): Deployment completed" >> $LOG_FILE
   ```
   
   Make it executable:
   ```bash
   chmod +x /var/scripts/deploy-crypto-analytics.sh
   ```

2. **Install Webhook Listener**
   
   ```bash
   npm install -g webhook
   ```
   
   Create webhook config:
   ```bash
   nano /var/scripts/hooks.json
   ```
   
   Add:
   ```json
   [
     {
       "id": "deploy-crypto-analytics",
       "execute-command": "/var/scripts/deploy-crypto-analytics.sh",
       "command-working-directory": "/var/www/crypto-analytics",
       "pass-arguments-to-command": [],
       "trigger-rule": {
         "and": [
           {
             "match": {
               "type": "payload-hash-sha256",
               "secret": "your-webhook-secret-here",
               "parameter": {
                 "source": "header",
                 "name": "X-Hub-Signature-256"
               }
             }
           },
           {
             "match": {
               "type": "value",
               "value": "refs/heads/main",
               "parameter": {
                 "source": "payload",
                 "name": "ref"
               }
             }
           }
         ]
       }
     }
   ]
   ```

3. **Run Webhook as Service**
   
   ```bash
   nano /etc/systemd/system/webhook.service
   ```
   
   Add:
   ```ini
   [Unit]
   Description=Webhook Service
   After=network.target
   
   [Service]
   Type=simple
   User=www-data
   ExecStart=/usr/local/bin/webhook -hooks /var/scripts/hooks.json -verbose -port 9000
   Restart=on-failure
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable webhook
   sudo systemctl start webhook
   ```

4. **Configure GitHub Webhook**
   
   - Go to your repository Settings → Webhooks → Add webhook
   - Payload URL: `http://your-server:9000/hooks/deploy-crypto-analytics`
   - Content type: `application/json`
   - Secret: The secret you used in hooks.json
   - Events: Just the push event
   - Active: ✓

---

## Database Migration

### Current Setup
Your app currently uses Supabase (PostgreSQL).

### Migration Options

#### Option A: Replace Supabase with Another Database

1. **Install database client**
   
   For PostgreSQL:
   ```bash
   npm install pg
   ```
   
   For MySQL:
   ```bash
   npm install mysql2
   ```
   
   For MongoDB:
   ```bash
   npm install mongodb
   ```

2. **Create new database connection file**
   
   Example for PostgreSQL (`src/lib/database.ts`):
   ```typescript
   import { Pool } from 'pg';
   
   const pool = new Pool({
     host: import.meta.env.VITE_DB_HOST,
     port: parseInt(import.meta.env.VITE_DB_PORT || '5432'),
     database: import.meta.env.VITE_DB_NAME,
     user: import.meta.env.VITE_DB_USER,
     password: import.meta.env.VITE_DB_PASSWORD,
     ssl: import.meta.env.VITE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
   });
   
   export const query = async (text: string, params?: any[]) => {
     const client = await pool.connect();
     try {
       return await client.query(text, params);
     } finally {
       client.release();
     }
   };
   
   export default pool;
   ```

3. **Update environment variables**
   
   Add to `.env`:
   ```env
   VITE_DB_HOST=your-database-host
   VITE_DB_PORT=5432
   VITE_DB_NAME=crypto_analytics
   VITE_DB_USER=your-username
   VITE_DB_PASSWORD=your-password
   VITE_DB_SSL=true
   ```

#### Option B: Add Secondary Database (Keep Supabase)

Create a separate connection file for the new database while keeping Supabase.

---

## Environment Configuration

### Local Development (.env)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# New database (if adding)
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=crypto_analytics
VITE_DB_USER=postgres
VITE_DB_PASSWORD=your_password
```

### Production Server
Store environment variables in:
- `.env` file in deployment directory
- System environment variables
- PM2 ecosystem file

Example PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'crypto-analytics',
    script: 'serve',
    args: '-s dist -l 3000',
    env: {
      NODE_ENV: 'production',
      VITE_SUPABASE_URL: 'your_url',
      VITE_SUPABASE_ANON_KEY: 'your_key'
    }
  }]
};
```

---

## Security Checklist

- [ ] Never commit `.env` files to git
- [ ] Use SSH keys instead of passwords
- [ ] Restrict SSH access to specific IPs if possible
- [ ] Use firewall to limit open ports
- [ ] Keep Node.js and dependencies updated
- [ ] Use HTTPS/SSL certificates (Let's Encrypt)
- [ ] Rotate database credentials regularly
- [ ] Use read-only database users where possible
- [ ] Enable database connection encryption

---

## Troubleshooting

### Deployment fails
- Check GitHub Actions logs
- Verify SSH key is correct
- Ensure server has enough disk space
- Check file permissions

### Database connection issues
- Verify credentials in `.env`
- Check firewall rules
- Ensure database allows remote connections
- Test connection with `psql` or database client

### PM2 not restarting
```bash
pm2 logs crypto-analytics
pm2 restart crypto-analytics
pm2 delete crypto-analytics
pm2 start ecosystem.config.js
```

---

## Next Steps

1. Choose deployment method (GitHub Actions or Webhook)
2. Set up server and add secrets to GitHub
3. Test deployment with a small change
4. Decide on database strategy
5. Migrate data if needed
6. Update application code for new database

For specific database migration assistance, please provide:
- Database type you want to use
- Connection credentials (via environment variables)
- Whether to keep or replace Supabase
