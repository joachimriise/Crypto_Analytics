import { supabase } from '../supabase';
import { fetchCurrentPrices as fetchLiveCoinWatchPrices } from '../api/livecoinwatch';
import { fetchCurrentPrices as fetchCoinGeckoPrices } from '../api/coingecko';
import { fetchGlobalQuote } from '../api/alpha-vantage';
import { fetchFinancialNews } from '../api/newsapi';
import { TOP_CRYPTOS } from '../constants';

export class DataCollectorService {
  async collectCurrentCryptoPrices(): Promise<void> {
    try {
      const coinCodes = TOP_CRYPTOS.map(c => c.symbol);

      let priceRecords;

      try {
        const prices = await fetchLiveCoinWatchPrices(coinCodes);

        priceRecords = prices.map(price => ({
          symbol: price.code,
          name: price.name,
          price_usd: price.rate,
          open: price.rate,
          high: price.rate * (1 + (price.delta?.day || 0) / 100),
          low: price.rate * (1 - Math.abs(price.delta?.day || 0) / 100),
          volume: price.volume,
          market_cap: price.cap,
          timestamp: new Date().toISOString(),
        }));
      } catch (lcwError) {
        console.log('LiveCoinWatch failed, falling back to CoinGecko:', lcwError);

        const coinIds = TOP_CRYPTOS.map(c => c.id);
        const prices = await fetchCoinGeckoPrices(coinIds);

        priceRecords = prices.map(price => ({
          symbol: price.symbol.toUpperCase(),
          name: price.name,
          price_usd: price.current_price,
          open: price.current_price,
          high: price.high_24h,
          low: price.low_24h,
          volume: price.total_volume,
          market_cap: price.market_cap,
          timestamp: new Date().toISOString(),
        }));
      }

      const { error } = await supabase.from('crypto_prices').insert(priceRecords);

      if (error) {
        console.error('Error saving crypto prices:', error);
      } else {
        console.log('Live prices collected:', priceRecords.length);
      }

      await this.cleanupOldLiveData();
    } catch (error) {
      console.error('Failed to collect crypto prices:', error);
    }
  }

  async cleanupOldLiveData(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      oneDayAgo.setHours(0, 0, 0, 0);

      const { error } = await supabase
        .from('crypto_prices')
        .delete()
        .lt('timestamp', twentyFourHoursAgo.toISOString())
        .gt('timestamp', oneDayAgo.toISOString());

      if (error && error.code !== 'PGRST116') {
        console.error('Error cleaning up old live data:', error);
      }
    } catch (error) {
      console.error('Failed to cleanup old live data:', error);
    }
  }

  async collectMarketIndices(): Promise<void> {
    try {
      const sp500 = await fetchGlobalQuote('SPY');

      const indexRecord = {
        index_name: 'SP500',
        value: sp500.price,
        change_percent: parseFloat(sp500.changePercent.replace('%', '')),
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase.from('market_indices').insert(indexRecord);

      if (error) {
        console.error('Error saving market index:', error);
      }
    } catch (error) {
      console.error('Failed to collect market indices:', error);
    }
  }

  async collectLatestNews(): Promise<void> {
    try {
      const articles = await fetchFinancialNews(
        'cryptocurrency OR bitcoin OR ethereum OR tariff OR regulation OR fed',
        50
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

      const { error } = await supabase.from('news_events').upsert(newsRecords, {
        onConflict: 'url',
        ignoreDuplicates: true,
      });

      if (error) {
        console.error('Error saving news:', error);
      }
    } catch (error) {
      console.error('Failed to collect news:', error);
    }
  }

  async runHourlyCollection(): Promise<void> {
    console.log('Running hourly data collection...');
    await this.collectCurrentCryptoPrices();
    console.log('Crypto prices collected');
  }

  async runDailyCollection(): Promise<void> {
    console.log('Running daily data collection...');
    await this.collectMarketIndices();
    console.log('Market indices collected');
  }

  async runNewsCollection(): Promise<void> {
    console.log('Running news collection...');
    await this.collectLatestNews();
    console.log('News collected');
  }
}

export const dataCollectorService = new DataCollectorService();
