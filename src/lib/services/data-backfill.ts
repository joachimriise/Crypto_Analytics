import { supabase } from '../supabase';
import { fetchHistoricalData, fetchOHLCData } from '../api/coingecko';
import { fetchSP500Data } from '../api/alpha-vantage';
import { fetchHistoricalNews } from '../api/newsapi';
import { TOP_CRYPTOS } from '../constants';

const FIVE_YEARS_IN_DAYS = 1825;
const BATCH_DELAY_MS = 2000;

interface BackfillProgress {
  total: number;
  completed: number;
  currentTask: string;
  errors: string[];
}

export class DataBackfillService {
  private progress: BackfillProgress = {
    total: 0,
    completed: 0,
    currentTask: '',
    errors: [],
  };

  getProgress(): BackfillProgress {
    return { ...this.progress };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async backfillCryptoPrices(): Promise<void> {
    this.progress.total = TOP_CRYPTOS.length;
    this.progress.completed = 0;
    this.progress.currentTask = 'Backfilling crypto price history';

    for (const crypto of TOP_CRYPTOS) {
      try {
        this.progress.currentTask = `Fetching ${crypto.name} historical data...`;

        const historicalData = await fetchHistoricalData(crypto.id, FIVE_YEARS_IN_DAYS);

        const priceRecords = historicalData.prices.map((pricePoint, index) => {
          const [timestamp, price] = pricePoint;
          const [, marketCap] = historicalData.market_caps[index] || [0, 0];
          const [, volume] = historicalData.total_volumes[index] || [0, 0];

          return {
            symbol: crypto.symbol,
            name: crypto.name,
            price_usd: price,
            open: price,
            high: price,
            low: price,
            volume: volume,
            market_cap: marketCap,
            timestamp: new Date(timestamp).toISOString(),
          };
        });

        for (let i = 0; i < priceRecords.length; i += 100) {
          const batch = priceRecords.slice(i, i + 100);
          const { error } = await supabase.from('crypto_prices').upsert(batch, {
            onConflict: 'symbol,timestamp',
          });

          if (error) {
            this.progress.errors.push(`Error saving ${crypto.name} prices: ${error.message}`);
          }
        }

        this.progress.completed++;
        await this.delay(BATCH_DELAY_MS);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.progress.errors.push(`Failed to backfill ${crypto.name}: ${message}`);
        this.progress.completed++;
      }
    }
  }

  async backfillCryptoOHLC(): Promise<void> {
    this.progress.total = TOP_CRYPTOS.length;
    this.progress.completed = 0;
    this.progress.currentTask = 'Backfilling crypto OHLC data';

    for (const crypto of TOP_CRYPTOS) {
      try {
        this.progress.currentTask = `Fetching ${crypto.name} OHLC data...`;

        const ohlcData = await fetchOHLCData(crypto.id, FIVE_YEARS_IN_DAYS);

        const priceRecords = ohlcData.map(([timestamp, open, high, low, close]) => ({
          symbol: crypto.symbol,
          name: crypto.name,
          price_usd: close,
          open,
          high,
          low,
          volume: 0,
          market_cap: 0,
          timestamp: new Date(timestamp).toISOString(),
        }));

        for (let i = 0; i < priceRecords.length; i += 100) {
          const batch = priceRecords.slice(i, i + 100);

          await supabase
            .from('crypto_prices')
            .upsert(batch, { onConflict: 'symbol,timestamp' });
        }

        this.progress.completed++;
        await this.delay(BATCH_DELAY_MS);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.progress.errors.push(`Failed to backfill ${crypto.name} OHLC: ${message}`);
        this.progress.completed++;
      }
    }
  }

  async backfillMarketIndices(): Promise<void> {
    this.progress.total = 1;
    this.progress.completed = 0;
    this.progress.currentTask = 'Backfilling S&P 500 data';

    try {
      const sp500Data = await fetchSP500Data();

      const indexRecords = sp500Data.map(data => ({
        index_name: 'SP500',
        value: data.close,
        change_percent: 0,
        timestamp: new Date(data.timestamp).toISOString(),
      }));

      for (let i = 0; i < indexRecords.length; i += 100) {
        const batch = indexRecords.slice(i, i + 100);
        await supabase.from('market_indices').upsert(batch, {
          onConflict: 'index_name,timestamp',
        });
      }

      this.progress.completed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.progress.errors.push(`Failed to backfill S&P 500: ${message}`);
      this.progress.completed++;
    }
  }

  async backfillHistoricalNews(): Promise<void> {
    const monthsToBackfill = 60;
    this.progress.total = monthsToBackfill;
    this.progress.completed = 0;
    this.progress.currentTask = 'Backfilling historical news';

    const now = new Date();

    for (let monthsAgo = 0; monthsAgo < monthsToBackfill; monthsAgo++) {
      try {
        const toDate = new Date(now);
        toDate.setMonth(toDate.getMonth() - monthsAgo);

        const fromDate = new Date(toDate);
        fromDate.setMonth(fromDate.getMonth() - 1);

        this.progress.currentTask = `Fetching news from ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}...`;

        const articles = await fetchHistoricalNews(
          'cryptocurrency OR bitcoin OR ethereum OR tariff OR "federal reserve" OR "interest rates" OR inflation OR "trade war" OR recession OR geopolitics OR war OR sanctions OR "oil prices"',
          fromDate.toISOString().split('T')[0],
          toDate.toISOString().split('T')[0],
          100
        );

        const newsRecords = articles.map(article => ({
          title: article.title,
          description: article.description || '',
          source: article.source.name,
          url: article.url,
          category: 'general',
          sentiment_score: 0,
          impact_level: 'medium',
          published_at: article.publishedAt,
        }));

        if (newsRecords.length > 0) {
          await supabase.from('news_events').upsert(newsRecords, {
            onConflict: 'url',
          });
        }

        this.progress.completed++;
        await this.delay(BATCH_DELAY_MS);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.progress.errors.push(`Failed to backfill news for month ${monthsAgo}: ${message}`);
        this.progress.completed++;
      }
    }
  }

  async runFullBackfill(): Promise<void> {
    console.log('Starting full data backfill...');

    await this.backfillCryptoPrices();
    console.log('Crypto prices backfilled');

    await this.backfillMarketIndices();
    console.log('Market indices backfilled');

    await this.backfillHistoricalNews();
    console.log('Historical news backfilled');

    console.log('Backfill complete!');
    console.log(`Total errors: ${this.progress.errors.length}`);

    if (this.progress.errors.length > 0) {
      console.error('Errors:', this.progress.errors);
    }
  }
}

export const dataBackfillService = new DataBackfillService();
