/**
 * LiveCoinWatch Data Collector for Supabase
 * 
 * This script fetches historical and real-time crypto prices from LiveCoinWatch
 * and stores them in Supabase for AI-powered trend analysis.
 * 
 * Data collected:
 * - Historical daily prices from 2020-01-01 to present
 * - Real-time minute prices for last 24 hours
 * - Top 10 cryptocurrencies by market cap
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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

// Utility: Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Format date for API
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

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
      throw new Error(`API error: ${response.status}`);
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
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error(`Error fetching minute data for ${coin.code}:`, error.message);
    return [];
  }
}

/**
 * Store historical prices in Supabase
 */
async function storeHistoricalPrices(coin, priceData) {
  const records = priceData.map(item => ({
    symbol: coin.code,
    price: item.rate,
    timestamp: new Date(item.date).toISOString()
  }));

  // Insert in batches of 100 to avoid timeout
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('historical_prices')
      .upsert(batch, { 
        onConflict: 'symbol,timestamp',
        ignoreDuplicates: true 
      });

    if (error) {
      console.error(`Error storing historical prices for ${coin.code}:`, error.message);
    } else {
      console.log(`✓ Stored ${batch.length} historical prices for ${coin.code} (${i + 1}-${i + batch.length}/${records.length})`);
    }

    // Rate limiting - wait between batches
    await sleep(100);
  }
}

/**
 * Store live minute prices in Supabase
 */
async function storeLivePrices(coin, priceData) {
  const records = priceData.map(item => ({
    symbol: coin.code,
    name: coin.name,
    price: item.rate,
    change_24h: null, // Will be calculated later
    volume_24h: item.volume || null,
    market_cap: item.cap || null,
    timestamp: new Date(item.date).toISOString()
  }));

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('live_prices')
      .insert(batch);

    if (error) {
      console.error(`Error storing live prices for ${coin.code}:`, error.message);
    } else {
      console.log(`✓ Stored ${batch.length} live prices for ${coin.code}`);
    }

    await sleep(100);
  }
}

/**
 * Main function to collect all historical data
 */
async function collectHistoricalData() {
  console.log('🚀 Starting historical data collection...\n');
  console.log(`📊 Collecting daily prices from 2020-01-01 to today`);
  console.log(`💰 Cryptocurrencies: ${TOP_CRYPTOS.map(c => c.code).join(', ')}\n`);

  const startDate = new Date('2020-01-01');
  const endDate = new Date();
  
  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  console.log(`📅 Date range: ${formatDate(startDate)} to ${formatDate(endDate)} (${totalDays} days)\n`);

  for (let i = 0; i < TOP_CRYPTOS.length; i++) {
    const coin = TOP_CRYPTOS[i];
    console.log(`\n[${i + 1}/${TOP_CRYPTOS.length}] Processing ${coin.name} (${coin.code})...`);
    
    try {
      // Fetch historical daily data
      console.log(`  📥 Fetching historical daily prices...`);
      const historicalData = await fetchHistoricalDaily(coin, startDate, endDate);
      
      if (historicalData.length > 0) {
        console.log(`  💾 Storing ${historicalData.length} daily prices...`);
        await storeHistoricalPrices(coin, historicalData);
      } else {
        console.log(`  ⚠️  No historical data received`);
      }

      // Rate limiting between coins
      if (i < TOP_CRYPTOS.length - 1) {
        console.log(`  ⏳ Waiting 2 seconds before next coin...`);
        await sleep(2000);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${coin.code}:`, error.message);
    }
  }

  console.log('\n✅ Historical data collection complete!');
}

/**
 * Collect minute-by-minute data for last 24 hours
 */
async function collectMinuteData() {
  console.log('\n🕐 Starting minute-by-minute data collection (last 24 hours)...\n');

  for (let i = 0; i < TOP_CRYPTOS.length; i++) {
    const coin = TOP_CRYPTOS[i];
    console.log(`[${i + 1}/${TOP_CRYPTOS.length}] Processing ${coin.name} (${coin.code})...`);
    
    try {
      // Fetch minute data
      console.log(`  📥 Fetching minute prices...`);
      const minuteData = await fetchMinutePrices(coin);
      
      if (minuteData.length > 0) {
        console.log(`  💾 Storing ${minuteData.length} minute prices...`);
        await storeLivePrices(coin, minuteData);
      } else {
        console.log(`  ⚠️  No minute data received`);
      }

      // Rate limiting
      if (i < TOP_CRYPTOS.length - 1) {
        console.log(`  ⏳ Waiting 2 seconds before next coin...`);
        await sleep(2000);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${coin.code}:`, error.message);
    }
  }

  console.log('\n✅ Minute data collection complete!');
}

/**
 * Verify data was stored correctly
 */
async function verifyData() {
  console.log('\n📊 Verifying stored data...\n');

  // Check historical prices
  const { data: historicalCount, error: histError } = await supabase
    .from('historical_prices')
    .select('symbol', { count: 'exact', head: true });

  if (!histError) {
    const { data: bySymbol } = await supabase
      .from('historical_prices')
      .select('symbol')
      .limit(1000);
    
    const counts = {};
    bySymbol?.forEach(row => {
      counts[row.symbol] = (counts[row.symbol] || 0) + 1;
    });

    console.log('Historical Prices:');
    Object.entries(counts).forEach(([symbol, count]) => {
      console.log(`  ${symbol}: ${count} records`);
    });
  }

  // Check live prices
  const { data: liveCount, error: liveError } = await supabase
    .from('live_prices')
    .select('symbol', { count: 'exact', head: true });

  if (!liveError) {
    const { data: bySymbol } = await supabase
      .from('live_prices')
      .select('symbol')
      .limit(1000);
    
    const counts = {};
    bySymbol?.forEach(row => {
      counts[row.symbol] = (counts[row.symbol] || 0) + 1;
    });

    console.log('\nLive Prices (24h):');
    Object.entries(counts).forEach(([symbol, count]) => {
      console.log(`  ${symbol}: ${count} records`);
    });
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Crypto Analytics - Historical Data Collection');
  console.log('═══════════════════════════════════════════════════════\n');

  // Validate API key
  if (!LCW_API_KEY) {
    console.error('❌ Error: VITE_LIVECOINWATCH_API_KEY not found in .env file');
    console.log('\nGet your free API key at: https://www.livecoinwatch.com/tools/api');
    process.exit(1);
  }

  // Validate Supabase
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Error: Supabase credentials not found in .env file');
    process.exit(1);
  }

  console.log('✓ API key found');
  console.log('✓ Supabase connected\n');

  const startTime = Date.now();

  try {
    // Step 1: Collect historical daily data (2020-present)
    await collectHistoricalData();

    // Step 2: Collect minute data (last 24 hours)
    await collectMinuteData();

    // Step 3: Verify data
    await verifyData();

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${duration} seconds`);
    console.log('\n✅ All data collection complete!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Set up scheduled job to fetch new minute prices every minute');
    console.log('   2. Set up daily job to fetch new daily prices');
    console.log('   3. Begin collecting news events for correlation analysis');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { collectHistoricalData, collectMinuteData, verifyData };
