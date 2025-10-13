import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile(path) {
  const envContent = readFileSync(path, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  return env;
}

const env = loadEnvFile(resolve(__dirname, '../.env'));
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const cryptos = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
];

async function fetchCoinGeckoPrices(coinId, days) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupHistoricalData() {
  console.log('🚀 Starting historical data setup...\n');
  console.log('📋 This script loads 5 YEARS of DAILY historical price data (2020-2025)');
  console.log('📅 One price point per day per currency');
  console.log('⏱️  Takes 30-60 minutes due to CoinGecko free API rate limits (1 call/min)\n');
  console.log('💡 TIP: Use LiveCoinWatch instead for 2-minute setup!');
  console.log('   Get free API key: https://www.livecoinwatch.com/tools/api');
  console.log('   Then run: npm run setup\n');
  console.log('⏸️  Press Ctrl+C to cancel and use LiveCoinWatch instead\n');

  await sleep(5000);

  let totalRecords = 0;
  const DELAY_BETWEEN_REQUESTS = 65000;

  for (const crypto of cryptos) {
    console.log(`📊 Fetching ${crypto.name} (${crypto.symbol})...`);

    try {
      const data = await fetchCoinGeckoPrices(crypto.id, 1825);

      if (!data.prices || data.prices.length === 0) {
        console.log(`   ⚠️  No data returned`);
        continue;
      }

      const dailyPrices = new Map();

      data.prices.forEach((point, idx) => {
        const [timestamp, price] = point;
        const date = new Date(timestamp);
        const dayKey = date.toISOString().split('T')[0];

        if (!dailyPrices.has(dayKey)) {
          const volume = data.total_volumes?.[idx]?.[1] || 0;
          const marketCap = data.market_caps?.[idx]?.[1] || 0;

          dailyPrices.set(dayKey, {
            price,
            volume,
            marketCap,
            timestamp,
          });
        }
      });

      const priceRecords = Array.from(dailyPrices.values()).map(item => {
        const date = new Date(item.timestamp);
        date.setUTCHours(12, 0, 0, 0);

        return {
          symbol: crypto.symbol,
          name: crypto.name,
          price_usd: item.price,
          open: item.price,
          high: item.price * 1.02,
          low: item.price * 0.98,
          volume: item.volume,
          market_cap: item.marketCap,
          timestamp: date.toISOString(),
        };
      });

      for (let i = 0; i < priceRecords.length; i += 500) {
        const batch = priceRecords.slice(i, i + 500);
        const { error } = await supabase.from('crypto_prices').upsert(batch, {
          onConflict: 'symbol,timestamp',
          ignoreDuplicates: true,
        });

        if (error) {
          console.error(`   ❌ Error saving batch: ${error.message}`);
        }
      }

      totalRecords += priceRecords.length;
      console.log(`   ✅ Saved ${priceRecords.length} daily records`);

      if (cryptos.indexOf(crypto) < cryptos.length - 1) {
        console.log(`   ⏳ Waiting 65 seconds to respect rate limits...`);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      if (error.message.includes('Rate Limit') || error.message.includes('429')) {
        console.log(`   ⏳ Rate limited. Waiting 2 minutes before continuing...`);
        await sleep(120000);
      }
    }
  }

  console.log(`\n💡 Note: Real news and market data will be fetched automatically when you start the dashboard.`);

  console.log(`\n✨ Setup complete!`);
  console.log(`   Total price records: ${totalRecords}`);
  console.log(`   Now start the app with: npm run dev`);
}

setupHistoricalData().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
