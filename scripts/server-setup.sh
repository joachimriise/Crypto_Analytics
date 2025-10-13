#!/bin/bash

# ============================================
# Crypto Analytics - Server Setup Script
# ============================================
# 
# This script helps you set up your server for auto-deployment.
# Run this once on your server to prepare everything.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/joachimriise/Crypto_Analytics/main/scripts/server-setup.sh | bash
#   OR
#   wget -qO- https://raw.githubusercontent.com/joachimriise/Crypto_Analytics/main/scripts/server-setup.sh | bash
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/var/www/crypto-analytics"
REPO_URL="https://github.com/joachimriise/Crypto_Analytics.git"
BRANCH="main"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Crypto Analytics - Server Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ============================================
# Check if running as root
# ============================================

if [ "$EUID" -eq 0 ]; then
  echo -e "${YELLOW}Warning: Running as root. Consider using sudo for specific commands instead.${NC}"
fi

# ============================================
# Update system packages
# ============================================

echo -e "${GREEN}[1/8] Updating system packages...${NC}"
apt-get update -qq

# ============================================
# Install Node.js
# ============================================

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}[2/8] Node.js is already installed: $NODE_VERSION${NC}"
else
    echo -e "${GREEN}[2/8] Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    apt-get install -y nodejs
    echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
fi

# ============================================
# Install Git
# ============================================

if command -v git &> /dev/null; then
    echo -e "${GREEN}[3/8] Git is already installed: $(git --version)${NC}"
else
    echo -e "${GREEN}[3/8] Installing Git...${NC}"
    apt-get install -y git
    echo -e "${GREEN}✓ Git installed${NC}"
fi

# ============================================
# Install PM2
# ============================================

if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}[4/8] PM2 is already installed: $(pm2 --version)${NC}"
else
    echo -e "${GREEN}[4/8] Installing PM2...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
fi

# ============================================
# Install serve (for serving static files)
# ============================================

if command -v serve &> /dev/null; then
    echo -e "${GREEN}[5/8] serve is already installed${NC}"
else
    echo -e "${GREEN}[5/8] Installing serve...${NC}"
    npm install -g serve
    echo -e "${GREEN}✓ serve installed${NC}"
fi

# ============================================
# Create deployment directory
# ============================================

echo -e "${GREEN}[6/8] Setting up deployment directory...${NC}"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Creating deployment directory: $DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR"
    chown -R $USER:$USER "$DEPLOY_DIR"
    echo -e "${GREEN}✓ Deployment directory created${NC}"
else
    echo -e "${YELLOW}Deployment directory already exists${NC}"
fi

# ============================================
# Clone repository
# ============================================

echo -e "${GREEN}[7/8] Cloning repository...${NC}"

cd "$DEPLOY_DIR"

if [ ! -d ".git" ]; then
    git clone "$REPO_URL" temp_clone
    mv temp_clone/{.,}* . 2>/dev/null || true
    rm -rf temp_clone
    echo -e "${GREEN}✓ Repository cloned${NC}"
else
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull origin "$BRANCH"
fi

# ============================================
# Install dependencies and build
# ============================================

echo -e "${GREEN}[8/8] Installing dependencies and building...${NC}"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${RED}IMPORTANT: Please edit .env file with your actual credentials!${NC}"
    echo "nano $DEPLOY_DIR/.env"
fi

npm install
npm run build

echo -e "${GREEN}✓ Dependencies installed and app built${NC}"

# ============================================
# Setup PM2
# ============================================

echo -e "${GREEN}Setting up PM2...${NC}"

# Setup PM2 startup script
pm2 startup systemd -u $USER --hp /home/$USER
echo -e "${GREEN}✓ PM2 startup configured${NC}"

# Start the application
if pm2 describe crypto-analytics &> /dev/null; then
    echo -e "${YELLOW}Application already running in PM2. Restarting...${NC}"
    pm2 restart crypto-analytics
else
    echo "Starting application with PM2..."
    pm2 start ecosystem.config.js --env production
fi

# Save PM2 process list
pm2 save

echo -e "${GREEN}✓ Application started with PM2${NC}"

# ============================================
# Install and configure Nginx (optional)
# ============================================

echo ""
echo -e "${YELLOW}Would you like to install and configure Nginx as a reverse proxy? (y/n)${NC}"
read -r INSTALL_NGINX

if [[ "$INSTALL_NGINX" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Installing Nginx...${NC}"
    apt-get install -y nginx
    
    echo -e "${YELLOW}Enter your domain name (or press Enter to skip):${NC}"
    read -r DOMAIN_NAME
    
    if [ -n "$DOMAIN_NAME" ]; then
        # Create Nginx configuration
         tee /etc/nginx/sites-available/crypto-analytics > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
        
        # Enable the site
        ln -sf /etc/nginx/sites-available/crypto-analytics /etc/nginx/sites-enabled/
        
        # Test Nginx configuration
        nginx -t
        
        # Restart Nginx
        systemctl restart nginx
        
        echo -e "${GREEN}✓ Nginx configured for $DOMAIN_NAME${NC}"
        
        echo -e "${YELLOW}Would you like to install SSL certificate with Let's Encrypt? (y/n)${NC}"
        read -r INSTALL_SSL
        
        if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}Installing Certbot...${NC}"
            apt-get install -y certbot python3-certbot-nginx
            certbot --nginx -d "$DOMAIN_NAME"
            echo -e "${GREEN}✓ SSL certificate installed${NC}"
        fi
    fi
fi

# ============================================
# Setup webhook listener (optional)
# ============================================

echo ""
echo -e "${YELLOW}Would you like to set up a webhook listener for auto-deployment? (y/n)${NC}"
read -r SETUP_WEBHOOK

if [[ "$SETUP_WEBHOOK" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Installing webhook...${NC}"
    apt-get install -y webhook
    
    # Copy deployment script
     mkdir -p /var/scripts
     cp "$DEPLOY_DIR/scripts/deploy.sh" /var/scripts/deploy-crypto-analytics.sh
     chmod +x /var/scripts/deploy-crypto-analytics.sh
    
    echo -e "${YELLOW}Enter a webhook secret (or press Enter for random):${NC}"
    read -r WEBHOOK_SECRET
    
    if [ -z "$WEBHOOK_SECRET" ]; then
        WEBHOOK_SECRET=$(openssl rand -hex 32)
        echo "Generated webhook secret: $WEBHOOK_SECRET"
    fi
    
    # Create webhook configuration
     tee /var/scripts/hooks.json > /dev/null <<EOF
[
  {
    "id": "deploy-crypto-analytics",
    "execute-command": "/var/scripts/deploy-crypto-analytics.sh",
    "command-working-directory": "$DEPLOY_DIR",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hash-sha256",
            "secret": "$WEBHOOK_SECRET",
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
EOF
    
    # Create systemd service
     tee /etc/systemd/system/webhook.service > /dev/null <<EOF
[Unit]
Description=Webhook Service
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/bin/webhook -hooks /var/scripts/hooks.json -verbose -port 9000
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
    
     systemctl daemon-reload
     systemctl enable webhook
     systemctl start webhook
    
    echo -e "${GREEN}✓ Webhook listener configured${NC}"
    echo -e "${YELLOW}Add this webhook to GitHub:${NC}"
    echo "  URL: http://YOUR_SERVER_IP:9000/hooks/deploy-crypto-analytics"
    echo "  Secret: $WEBHOOK_SECRET"
    echo "  Content type: application/json"
fi

# ============================================
# Final information
# ============================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit your .env file with actual credentials:"
echo "   nano $DEPLOY_DIR/.env"
echo ""
echo "2. Check PM2 status:"
echo "   pm2 status"
echo "   pm2 logs crypto-analytics"
echo ""
echo "3. Access your application:"
echo "   http://YOUR_SERVER_IP:3000"
if [ -n "$DOMAIN_NAME" ]; then
    echo "   http://$DOMAIN_NAME"
fi
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 restart crypto-analytics  - Restart the app"
echo "  pm2 logs crypto-analytics     - View logs"
echo "  pm2 monit                      - Monitor app"
echo "  cd $DEPLOY_DIR && git pull     - Manually update code"
echo ""
echo -e "${GREEN}Enjoy your Crypto Analytics app!${NC}"
