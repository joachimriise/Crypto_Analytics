#!/bin/bash

# MySQL Database Setup Script for Crypto Analytics
# This script creates the database and tables needed for the application

echo "🗄️  MySQL Database Setup for Crypto Analytics"
echo "=============================================="
echo ""

# Database configuration
DB_NAME="crypto_analytics"
DB_USER="${MYSQL_USER:-root}"
DB_PASS="${MYSQL_PASSWORD:-}"

# Prompt for MySQL password if not set
if [ -z "$DB_PASS" ]; then
    echo "Enter MySQL password for user '$DB_USER' (press Enter if no password):"
    read -s DB_PASS
fi

echo ""
echo "Creating database and tables..."

# Create database and tables
mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} << EOF
-- Create database
CREATE DATABASE IF NOT EXISTS $DB_NAME;
USE $DB_NAME;

-- Historical prices table
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

-- Live prices table
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

-- Recommendations table
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

-- Market predictions table
CREATE TABLE IF NOT EXISTS market_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trend VARCHAR(20) NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    reasoning TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- News articles table (optional)
CREATE TABLE IF NOT EXISTS news_articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    url VARCHAR(1000),
    source VARCHAR(100),
    published_at DATETIME,
    sentiment VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' and tables created successfully!"
    echo ""
    echo "Connection details:"
    echo "  Database: $DB_NAME"
    echo "  Host: localhost"
    echo "  Port: 3306"
    echo "  User: $DB_USER"
    echo ""
    echo "Add these to your .env file:"
    echo "  VITE_DB_PROVIDER=mysql"
    echo "  VITE_DB_HOST=localhost"
    echo "  VITE_DB_PORT=3306"
    echo "  VITE_DB_NAME=$DB_NAME"
    echo "  VITE_DB_USER=$DB_USER"
    echo "  VITE_DB_PASSWORD=your_password"
else
    echo "❌ Failed to create database. Please check your MySQL credentials."
    exit 1
fi
