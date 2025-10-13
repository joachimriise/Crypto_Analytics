import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchCoinGeckoPrices(coinId: string, days: number) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const response = await fetch(url);
  return response.json();
}

async function setupHistoricalData() {
  console.log('🚀 Starting historical data setup...\n');

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

  let totalRecords = 0;

  for (const crypto of cryptos) {
    console.log(`📊 Fetching ${crypto.name} (${crypto.symbol})...`);

    try {
      const data = await fetchCoinGeckoPrices(crypto.id, 1825);

      const priceRecords = data.prices.map((point: [number, number], idx: number) => {
        const [timestamp, price] = point;
        const volume = data.total_volumes[idx]?.[1] || 0;
        const marketCap = data.market_caps[idx]?.[1] || 0;

        return {
          symbol: crypto.symbol,
          name: crypto.name,
          price_usd: price,
          open: price,
          high: price * 1.02,
          low: price * 0.98,
          volume: volume,
          market_cap: marketCap,
          timestamp: new Date(timestamp).toISOString(),
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
      console.log(`   ✅ Saved ${priceRecords.length} records`);

      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }

  console.log(`\n📰 Creating sample news events...`);
  const sampleNews = [
    {
      title: 'Bitcoin Reaches New All-Time High',
      description: 'Bitcoin surges past previous records as institutional adoption grows.',
      source: 'CryptoNews',
      url: 'https://example.com/btc-ath',
      category: 'market',
      sentiment_score: 0.8,
      impact_level: 'high',
      published_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      title: 'Federal Reserve Maintains Interest Rates',
      description: 'Fed keeps rates steady amid economic uncertainty.',
      source: 'Financial Times',
      url: 'https://example.com/fed',
      category: 'fed_policy',
      sentiment_score: 0.1,
      impact_level: 'high',
      published_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
    {
      title: 'Ethereum Network Upgrade Successful',
      description: 'Latest upgrade improves network efficiency.',
      source: 'EthNews',
      url: 'https://example.com/eth',
      category: 'tech',
      sentiment_score: 0.7,
      impact_level: 'medium',
      published_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
  ];

  const { error: newsError } = await supabase.from('news_events').insert(sampleNews);
  if (!newsError) {
    console.log('   ✅ News events created');
  }

  console.log(`\n📈 Creating market index data...`);
  const marketIndex = {
    index_name: 'SP500',
    value: 6050.25,
    change_percent: 0.45,
    timestamp: new Date().toISOString(),
  };

  const { error: marketError } = await supabase.from('market_indices').insert(marketIndex);
  if (!marketError) {
    console.log('   ✅ Market index created');
  }

  console.log(`\n✨ Setup complete!`);
  console.log(`   Total price records: ${totalRecords}`);
  console.log(`   Now run the app and it will auto-generate recommendations!`);
}

setupHistoricalData().catch(console.error);
