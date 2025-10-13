/**
 * LiveCoinWatch Data Collector for MySQL
 * 
 * This script fetches historical and real-time crypto prices from LiveCoinWatch
 * and stores them in MySQL database for AI-powered trend analysis.
 * 
 * Data collected:
 * - Historical daily prices from 2020-01-01 to present
 * - Real-time minute prices for last 24 hours
 * - Top 10 cryptocurrencies by market cap
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// LiveCoinWatch API configuration
const LCW_API_KEY = process.env.VITE_LIVECOINWATCH_API_KEY;
const LCW_API_URL = 'https://api.livecoinwatch.com';

// Top 10 cryptocurrencies to track
const TOP_CRYPTOS = [
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'ETH', name: 'Ethereum' },
  { code: 'BNB', name: 'BNB' },
  { code: 'SOL', name: 'Solana' },
  { code: 'XRP', name: 'XRP' },
  { code: 'ADA', name: 'Cardano' },
  { code: 'DOGE', name: 'Dogecoin' },
  { code: 'MATIC', name: 'Polygon' },
  { code: 'AVAX', name: 'Avalanche' },
  { code: 'DOT', name: 'Polkadot' }
];

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.VITE_DB_HOST || 'localhost',
  port: parseInt(process.env.VITE_DB_PORT || '3306'),
  user: process.env.VITE_DB_USER,
  password: process.env.VITE_DB_PASSWORD,
  database: process.env.VITE_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Utility: Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Format date for API
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Initialize database tables if they don't exist
 */
async function initializeTables() {
  const connection = await pool.getConnection();
  
  try {
    // Create historical_prices table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historical_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        price DECIMAL(20, 8) NOT NULL,
        timestamp DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_price (symbol, timestamp),
        INDEX idx_symbol (symbol),
        INDEX idx_timestamp (timestamp)
      )
    `);

    // Create live_prices table (for minute-by-minute data)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS live_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(20, 8) NOT NULL,
        change_24h DECIMAL(10, 2),
        volume_24h DECIMAL(30, 2),
        market_cap DECIMAL(30, 2),
        timestamp DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_symbol (symbol),
        INDEX idx_timestamp (timestamp)
      )
    `);

    // Create crypto_metadata table for storing coin information
    await connection.query(`
      CREATE TABLE IF NOT EXISTS crypto_metadata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_symbol (symbol)
      )
    `);

    console.log('✓ Database tables initialized');
  } finally {
    connection.release();
  }
}

/**
 * Store crypto metadata
 */
async function storeCryptoMetadata() {
  const connection = await pool.getConnection();
  
  try {
    for (const coin of TOP_CRYPTOS) {
      await connection.query(
        `INSERT INTO crypto_metadata (symbol, name) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [coin.code, coin.name]
      );
    }
    console.log('✓ Crypto metadata stored');
  } finally {
    connection.release();
  }
}

/**
 * Fetch historical daily prices from LiveCoinWatch
 */
async function fetchHistoricalDaily(coin, startDate, endDate) {
  try {
    const response = await fetch(`${LCW_API_URL}/coins/single/history`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': LCW_API_KEY,
      },
      body: JSON.stringify({
        currency: 'USD',
        code: coin.code,
        start: startDate.getTime(),
        end: endDate.getTime(),
        meta: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error(`Error fetching historical data for ${coin.code}:`, error.message);
    return [];
  }
}

/**
 * Fetch minute-by-minute prices for last 24 hours
 */
async function fetchMinutePrices(coin) {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const response = await fetch(`${LCW_API_URL}/coins/single/history`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': LCW_API_KEY,
      },
      body: JSON.stringify({
        currency: 'USD',
        code: coin.code,
        start: yesterday.getTime(),
        end: now.getTime(),
        meta: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error(`Error fetching minute data for ${coin.code}:`, error.message);
    return [];
  }
}

/**
 * Store historical prices in MySQL
 */
async function storeHistoricalPrices(coin, priceData) {
  if (priceData.length === 0) return;

  const connection = await pool.getConnection();
  
  try {
    // Prepare batch insert
    const batchSize = 500;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < priceData.length; i += batchSize) {
      const batch = priceData.slice(i, i + batchSize);
      
      const values = batch.map(item => [
        coin.code,
        item.rate,
        new Date(item.date)
      ]);

      try {
        const [result] = await connection.query(
          `INSERT IGNORE INTO historical_prices (symbol, price, timestamp) VALUES ?`,
          [values]
        );
        
        totalInserted += result.affectedRows;
        totalSkipped += batch.length - result.affectedRows;
      } catch (error) {
        console.error(`Error inserting batch for ${coin.code}:`, error.message);
      }

      // Progress indicator
      const progress = Math.min(i + batchSize, priceData.length);
      process.stdout.write(`\r  💾 Storing ${coin.code}: ${progress}/${priceData.length} records...`);
      
      // Rate limiting between batches
      await sleep(100);
    }
    
    console.log(`\r  ✓ Stored ${totalInserted} new records for ${coin.code} (${totalSkipped} duplicates skipped)`);
  } finally {
    connection.release();
  }
}

/**
 * Store live minute prices in MySQL
 */
async function