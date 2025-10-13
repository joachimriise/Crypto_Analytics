import { supabase } from '../supabase';
import { fetchCurrentPrices } from '../api/coingecko';
import { TOP_CRYPTOS } from '../constants';

export async function loadInitialTestData(): Promise<void> {
  console.log('Loading initial test data...');

  try {
    console.log('Fetching current crypto prices from CoinGecko...');
    const coinIds = TOP_CRYPTOS.map(c => c.id);
    const prices = await fetchCurrentPrices(coinIds);

    const priceRecords = prices.map(price => ({
      symbol: price.symbol.toUpperCase(),
      name: price.name,
      price_usd: price.current_price,
      open: price.current_price * 0.98,
      high: price.high_24h,
      low: price.low_24h,
      volume: price.total_volume,
      market_cap: price.market_cap,
      timestamp: new Date().toISOString(),
    }));

    const { error: pricesError } = await supabase.from('crypto_prices').insert(priceRecords);

    if (pricesError) {
      console.error('Error saving prices:', pricesError);
    } else {
      console.log(`✓ Saved ${priceRecords.length} crypto prices`);
    }

    console.log('Creating sample news events...');
    const sampleNews = [
      {
        title: 'Bitcoin Reaches New All-Time High Above $115,000',
        description: 'Bitcoin has surged to unprecedented levels as institutional adoption continues to grow.',
        source: 'CryptoNews',
        url: 'https://example.com/bitcoin-ath',
        category: 'market',
        sentiment_score: 0.8,
        impact_level: 'high',
        published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: 'Federal Reserve Maintains Interest Rates at Current Levels',
        description: 'The Fed decided to keep rates steady amid economic uncertainty.',
        source: 'Financial Times',
        url: 'https://example.com/fed-rates',
        category: 'fed_policy',
        sentiment_score: 0.1,
        impact_level: 'high',
        published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: 'Major Exchange Announces Enhanced Security Measures',
        description: 'Leading cryptocurrency exchange implements new security protocols following industry standards.',
        source: 'BlockchainDaily',
        url: 'https://example.com/security-measures',
        category: 'security',
        sentiment_score: 0.5,
        impact_level: 'medium',
        published_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: 'Ethereum Network Upgrade Successfully Completed',
        description: 'The latest Ethereum upgrade has been deployed without issues, improving network efficiency.',
        source: 'EthNews',
        url: 'https://example.com/eth-upgrade',
        category: 'tech',
        sentiment_score: 0.7,
        impact_level: 'medium',
        published_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: 'New Cryptocurrency Regulations Proposed in Senate',
        description: 'Senators introduce bill aimed at creating clearer regulatory framework for digital assets.',
        source: 'Reuters',
        url: 'https://example.com/crypto-regulation',
        category: 'regulation',
        sentiment_score: -0.3,
        impact_level: 'high',
        published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { error: newsError } = await supabase.from('news_events').insert(sampleNews);

    if (newsError) {
      console.error('Error saving news:', newsError);
    } else {
      console.log(`✓ Saved ${sampleNews.length} news events`);
    }

    console.log('Creating sample market index data...');
    const marketIndex = {
      index_name: 'SP500',
      value: 6050.25,
      change_percent: 0.45,
      timestamp: new Date().toISOString(),
    };

    const { error: marketError } = await supabase.from('market_indices').insert(marketIndex);

    if (marketError) {
      console.error('Error saving market data:', marketError);
    } else {
      console.log('✓ Saved market index data');
    }

    console.log('\n✅ Initial test data loaded successfully!');
    console.log('You can now generate recommendations from the Admin Panel.');
  } catch (error) {
    console.error('Error loading test data:', error);
    throw error;
  }
}
