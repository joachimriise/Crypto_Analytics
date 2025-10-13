/**
 * SQLite Database Configuration
 * 
 * This is a lightweight, file-based database that requires no server.
 * Perfect for development and small deployments.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.VITE_SQLITE_PATH || './data/crypto_analytics.db';

// Ensure data directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
const initTables = () => {
  // Historical prices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS historical_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      price REAL NOT NULL,
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol, timestamp)
    );
    CREATE INDEX IF NOT EXISTS idx_historical_prices_symbol ON historical_prices(symbol);
    CREATE INDEX IF NOT EXISTS idx_historical_prices_timestamp ON historical_prices(timestamp);
  `);

  // Live prices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      change_24h REAL,
      volume_24h REAL,
      market_cap REAL,
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_live_prices_symbol ON live_prices(symbol);
    CREATE INDEX IF NOT EXISTS idx_live_prices_timestamp ON live_prices(timestamp);
  `);

  // Recommendations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      action TEXT NOT NULL,
      confidence REAL NOT NULL,
      reasoning TEXT NOT NULL,
      target_price REAL,
      stop_loss REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at);
  `);

  // Market predictions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trend TEXT NOT NULL,
      confidence REAL NOT NULL,
      reasoning TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON market_predictions(created_at);
  `);

  console.log('✅ SQLite database initialized:', DB_PATH);
};

// Initialize tables on first run
initTables();

// Database operations
export const sqlite = {
  // Insert
  insert: (table: string, data: Record<string, any>) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const stmt = db.prepare(`
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
    `);
    
    const result = stmt.run(...values);
    return result.lastInsertRowid;
  },

  // Update
  update: (table: string, id: number, data: Record<string, any>) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const stmt = db.prepare(`
      UPDATE ${table}
      SET ${setClause}
      WHERE id = ?
    `);
    
    stmt.run(...values, id);
  },

  // Delete
  delete: (table: string, id: number) => {
    const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    stmt.run(id);
  },

  // Find one
  findOne: (table: string, id: number) => {
    const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    return stmt.get(id);
  },

  // Find many
  findMany: (table: string, filters?: Record<string, any>) => {
    if (!filters || Object.keys(filters).length === 0) {
      const stmt = db.prepare(`SELECT * FROM ${table}`);
      return stmt.all();
    }
    
    const keys = Object.keys(filters);
    const values = Object.values(filters);
    const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
    
    const stmt = db.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`);
    return stmt.all(...values);
  },

  // Raw query
  query: (sql: string, params: any[] = []) => {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  // Close connection
  close: () => {
    db.close();
  }
};

export default sqlite;
