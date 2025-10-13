#!/bin/bash

# ============================================
# Crypto Analytics - Auto-Deployment Script
# ============================================
# 
# This script automatically pulls changes from GitHub,
# installs dependencies, builds the app, and restarts the service.
#
# Usage:
#   1. Copy this file to your server: /var/scripts/deploy-crypto-analytics.sh
#   2. Make it executable: chmod +x /var/scripts/deploy-crypto-analytics.sh
#   3. Set up as a webhook listener or cron job
#   4. Configure the variables below
#

# ============================================
# CONFIGURATION
# ============================================

# Directory where your app is deployed
DEPLOY_DIR="/var/www/crypto-analytics"

# Git repository URL
REPO_URL="https://github.com/joachimriise/Crypto_Analytics.git"

# Branch to deploy
BRANCH="main"

# Log file location
LOG_FILE="/var/log/crypto-deploy.log"

# PM2 app name
PM2_APP_NAME="crypto-analytics"

# Node environment
NODE_ENV="production"

# Port to serve the app (if using serve)
PORT=3000

# ============================================
# FUNCTIONS
# ============================================

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# ============================================
# PRE-DEPLOYMENT CHECKS
# ============================================

log_message "=========================================="
log_message "Starting deployment process"
log_message "=========================================="

# Check if required commands are available
check_command "git"
check_command "node"
check_command "npm"
check_command "pm2"

# Check if deployment directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    log_error "Deployment directory does not exist: $DEPLOY_DIR"
    log_message "Creating deployment directory and cloning repository..."
    
    # Create parent directory if needed
    mkdir -p "$(dirname "$DEPLOY_DIR")"
    
    # Clone the repository
    if git clone "$REPO_URL" "$DEPLOY_DIR"; then
        log_message "Repository cloned successfully"
    else
        log_error "Failed to clone repository"
        exit 1
    fi
fi

# Change to deployment directory
cd "$DEPLOY_DIR" || {
    log_error "Failed to change to deployment directory"
    exit 1
}

# ============================================
# GIT OPERATIONS
# ============================================

log_message "Fetching latest changes from GitHub..."

# Stash any local changes (shouldn't be any in production)
if git diff --quiet; then
    log_message "No local changes to stash"
else
    log_message "Stashing local changes..."
    git stash
fi

# Fetch latest changes
if git fetch origin "$BRANCH"; then
    log_message "Fetched latest changes"
else
    log_error "Failed to fetch changes"
    exit 1
fi

# Check if there are any changes to pull
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
    log_message "Already up to date. No deployment needed."
    exit 0
fi

log_message "New changes detected. Pulling changes..."

# Pull latest changes
if git pull origin "$BRANCH"; then
    log_message "Successfully pulled changes"
else
    log_error "Failed to pull changes"
    exit 1
fi

# Get the latest commit information
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)
COMMIT_AUTHOR=$(git log -1 --pretty=format:'%an')

log_message "Deploying commit: $COMMIT_HASH"
log_message "Commit message: $COMMIT_MESSAGE"
log_message "Commit author: $COMMIT_AUTHOR"

# ============================================
# DEPENDENCY INSTALLATION
# ============================================

log_message "Installing dependencies..."

# Check if package-lock.json has changed
if git diff --name-only HEAD@{1} HEAD | grep -q "package-lock.json"; then
    log_message "package-lock.json changed, running npm ci..."
    if npm ci --production=false; then
        log_message "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
else
    log_message "No changes in package-lock.json, skipping npm ci"
fi

# ============================================
# BUILD APPLICATION
# ============================================

log_message "Building application..."

# Load environment variables if .env exists
if [ -f ".env" ]; then
    log_message "Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Build the application
if npm run build; then
    log_message "Application built successfully"
else
    log_error "Build failed"
    exit 1
fi

# ============================================
# RESTART APPLICATION
# ============================================

log_message "Restarting application with PM2..."

# Check if PM2 app is already running
if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
    log_message "Restarting existing PM2 process..."
    if pm2 restart "$PM2_APP_NAME"; then
        log_message "PM2 process restarted successfully"
    else
        log_error "Failed to restart PM2 process"
        exit 1
    fi
else
    log_message "Starting new PM2 process..."
    
    # Start the application with PM2
    # Using 'serve' to serve the built files
    if pm2 start "serve -s dist -l $PORT" --name "$PM2_APP_NAME" --update-env; then
        log_message "PM2 process started successfully"
        pm2 save
    else
        log_error "Failed to start PM2 process"
        exit 1
    fi
fi

# ============================================
# POST-DEPLOYMENT
# ============================================

# Wait a bit for the app to start
sleep 3

# Check if the app is running
if pm2 describe "$PM2_APP_NAME" | grep -q "online"; then
    log_message "Application is running successfully"
else
    log_error "Application failed to start properly"
    pm2 logs "$PM2_APP_NAME" --lines 50 | tee -a "$LOG_FILE"
    exit 1
fi

# Display app status
pm2 info "$PM2_APP_NAME" | tee -a "$LOG_FILE"

# ============================================
# CLEANUP
# ============================================

log_message "Performing cleanup..."

# Remove old logs (keep last 7 days)
find /var/log -name "crypto-deploy-*.log" -mtime +7 -delete 2>/dev/null

log_message "=========================================="
log_message "Deployment completed successfully!"
log_message "=========================================="

# Send notification (optional - uncomment and configure)
# curl -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
#   -H 'Content-Type: application/json' \
#   -d "{\"text\":\"✅ Crypto Analytics deployed successfully!\nCommit: $COMMIT_HASH\nMessage: $COMMIT_MESSAGE\"}"

exit 0
