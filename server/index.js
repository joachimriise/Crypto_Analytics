import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection pool
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

// Test database connection
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL database');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err.message);
  });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Get all live prices
app.get('/api/prices/live', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM live_prices ORDER BY timestamp DESC LIMIT 100'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching live prices:', error);
    res.status(500).json({ error: 'Failed to fetch live prices' });
  }
});

// Get historical prices for a symbol
app.get('/api/prices/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 30 } = req.query;
    
    const [rows] = await pool.query(
      `SELECT * FROM historical_prices 
       WHERE symbol = ? 
       AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY timestamp ASC`,
      [symbol.toUpperCase(), days]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    res.status(500).json({ error: 'Failed to fetch historical prices' });
  }
});

// Insert live price
app.post('/api/prices/live', async (req, res) => {
  try {
    const { symbol, name, price, change_24h, volume_24h, market_cap, timestamp } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO live_prices (symbol, name, price, change_24h, volume_24h, market_cap, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [symbol, name, price, change_24h, volume_24h, market_cap, timestamp]
    );
    
    res.json({ id: result.insertId, message: 'Price inserted successfully' });
  } catch (error) {
    console.error('Error inserting live price:', error);
    res.status(500).json({ error: 'Failed to insert price' });
  }
});

// Insert historical price
app.post('/api/prices/historical', async (req, res) => {
  try {
    const { symbol, price, timestamp } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO historical_prices (symbol, price, timestamp)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE price = VALUES(price)`,
      [symbol, price, timestamp]
    );
    
    res.json({ id: result.insertId, message: 'Historical price inserted successfully' });
  } catch (error) {
    console.error('Error inserting historical price:', error);
    res.status(500).json({ error: 'Failed to insert historical price' });
  }
});

// Get all recommendations
app.get('/api/recommendations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM recommendations ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Insert recommendation
app.post('/api/recommendations', async (req, res) => {
  try {
    const { symbol, action, confidence, reasoning, target_price, stop_loss } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO recommendations (symbol, action, confidence, reasoning, target_price, stop_loss)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [symbol, action, confidence, reasoning, target_price, stop_loss]
    );
    
    res.json({ id: result.insertId, message: 'Recommendation inserted successfully' });
  } catch (error) {
    console.error('Error inserting recommendation:', error);
    res.status(500).json({ error: 'Failed to insert recommendation' });
  }
});

// Get market predictions
app.get('/api/predictions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM market_predictions ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

// Insert market prediction
app.post('/api/predictions', async (req, res) => {
  try {
    const { trend, confidence, reasoning } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO market_predictions (trend, confidence, reasoning)
       VALUES (?, ?, ?)`,
      [trend, confidence, reasoning]
    );
    
    res.json({ id: result.insertId, message: 'Prediction inserted successfully' });
  } catch (error) {
    console.error('Error inserting prediction:', error);
    res.status(500).json({ error: 'Failed to insert prediction' });
  }
});

// Delete old live prices (cleanup endpoint)
app.delete('/api/prices/live/cleanup', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const [result] = await pool.query(
      `DELETE FROM live_prices 
       WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [hours]
    );
    
    res.json({ deleted: result.affectedRows, message: 'Old prices cleaned up successfully' });
  } catch (error) {
    console.error('Error cleaning up old prices:', error);
    res.status(500).json({ error: 'Failed to cleanup old prices' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.VITE_DB_NAME}@${process.env.VITE_DB_HOST}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});
