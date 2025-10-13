/**
 * MySQL Database Configuration for Server-Side Use
 * 
 * This configuration uses MySQL for local database storage.
 * Note: This should run on the server side, not in the browser.
 */

import mysql from 'mysql2/promise';

// Database configuration from environment variables
const dbConfig = {
  host: process.env.VITE_DB_HOST || 'localhost',
  port: parseInt(process.env.VITE_DB_PORT || '3306'),
  user: process.env.VITE_DB_USER || 'root',
  password: process.env.VITE_DB_PASSWORD || '',
  database: process.env.VITE_DB_NAME || 'crypto_analytics',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
let pool: mysql.Pool | null = null;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
};

// Initialize database and tables
export const initializeDatabase = async () => {
  const connection = await getPool().getConnection();
  
  try {
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.query(`USE ${dbConfig.database}`);
    
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // Create live_prices table
    await connection.query(`
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
    `);
    
    // Create recommendations table
    await connection.query(`
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
    `);
    
    // Create market_predictions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS market_predictions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trend VARCHAR(20) NOT NULL,
        confidence DECIMAL(5, 2) NOT NULL,
        reasoning TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    console.log('✅ MySQL database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize MySQL database:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Database operations
export const mysqlDb = {
  // Get pool for direct queries
  getPool,
  
  // Initialize database
  init: initializeDatabase,
  
  // Insert
  insert: async (table: string, data: Record<string, any>) => {
    const connection = await getPool().getConnection();
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      
      const [result] = await connection.query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
      
      return (result as any).insertId;
    } finally {
      connection.release();
    }
  },
  
  // Update
  update: async (table: string, id: number, data: Record<string, any>) => {
    const connection = await getPool().getConnection();
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      
      await connection.query(
        `UPDATE ${table} SET ${setClause} WHERE id = ?`,
        [...values, id]
      );
    } finally {
      connection.release();
    }
  },
  
  // Delete
  delete: async (table: string, id: number) => {
    const connection = await getPool().getConnection();
    try {
      await connection.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    } finally {
      connection.release();
    }
  },
  
  // Find one
  findOne: async (table: string, id: number) => {
    const connection = await getPool().getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT * FROM ${table} WHERE id = ?`,
        [id]
      );
      return (rows as any[])[0] || null;
    } finally {
      connection.release();
    }
  },
  
  // Find many
  findMany: async (table: string, filters?: Record<string, any>) => {
    const connection = await getPool().getConnection();
    try {
      if (!filters || Object.keys(filters).length === 0) {
        const [rows] = await connection.query(`SELECT * FROM ${table}`);
        return rows as any[];
      }
      
      const keys = Object.keys(filters);
      const values = Object.values(filters);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      
      const [rows] = await connection.query(
        `SELECT * FROM ${table} WHERE ${whereClause}`,
        values
      );
      return rows as any[];
    } finally {
      connection.release();
    }
  },
  
  // Raw query
  query: async (sql: string, params: any[] = []) => {
    const connection = await getPool().getConnection();
    try {
      const [rows] = await connection.query(sql, params);
      return rows as any[];
    } finally {
      connection.release();
    }
  },
  
  // Close all connections
  close: async () => {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};

export default mysqlDb;
