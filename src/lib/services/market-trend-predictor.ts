import { supabase } from '../supabase';
import { TOP_CRYPTOS } from '../constants';

interface TrendPrediction {
  prediction_type: 'positive' | 'neutral' | 'negative';
  confidence_percent: number;
  reasoning: string;
  average_price_change: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  news_sentiment_score: number;
  macro_events_summary: string;
}

export class MarketTrendPredictor {
  async generateMarketTrendPrediction(): Promise<TrendPrediction> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const priceData = await this.get24HourPriceChanges();
    const newsData = await this.getRecentNewsSentiment();
    const macroData = await this.getMacroEventsSummary();

    const { bullish, bearish, neutral, avgChange } = this.analyzePriceTrends(priceData);

    const predictionType = this.determinePredictionType(
      bullish,
      bearish,
      neutral,
      avgChange,
      newsData.sentiment
    );

    const confidence = this.calculateConfidence(bullish, bearish, neutral, avgChange, newsData);

    const reasoning = this.generateReasoning(
      predictionType,
      bullish,
      bearish,
      neutral,
      avgChange,
      newsData,
      macroData
    );

    return {
      prediction_type: predictionType,
      confidence_percent: confidence,
      reasoning,
      average_price_change: avgChange,
      bullish_count: bullish,
      bearish_count: bearish,
      neutral_count: neutral,
      news_sentiment_score: newsData.sentiment,
      macro_events_summary: macroData,
    };
  }

  private async get24HourPriceChanges() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const symbols = TOP_CRYPTOS.map(c => c.symbol);

    const { data, error } = await supabase
      .from('crypto_prices')
      .select('symbol, price_usd, timestamp')
      .in('symbol', symbols)
      .gte('timestamp', twentyFourHoursAgo.toISOString())
      .order('timestamp', { ascending: true });

    if (error || !data) {
      console.error('Error fetching price data:', error);
      return [];
    }

    const priceChanges: { symbol: string; change: number }[] = [];

    symbols.forEach(symbol => {
      const symbolPrices = data.filter(p => p.symbol === symbol);
      if (symbolPrices.length >= 2) {
        const oldPrice = symbolPrices[0].price_usd;
        const newPrice = symbolPrices[symbolPrices.length - 1].price_usd;
        const change = ((newPrice - oldPrice) / oldPrice) * 100;
        priceChanges.push({ symbol, change });
      }
    });

    return priceChanges;
  }

  private analyzePriceTrends(priceData: { symbol: string; change: number }[]) {
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    let totalChange = 0;

    priceData.forEach(({ change }) => {
      totalChange += change;

      if (change > 2) {
        bullish++;
      } else if (change < -2) {
        bearish++;
      } else {
        neutral++;
      }
    });

    const avgChange = priceData.length > 0 ? totalChange / priceData.length : 0;

    return { bullish, bearish, neutral, avgChange };
  }

  private async getRecentNewsSentiment() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('news_events')
      .select('sentiment_score, impact_level, category')
      .gte('published_at', twentyFourHoursAgo.toISOString())
      .limit(50);

    if (error || !data || data.length === 0) {
      return { sentiment: 0, count: 0, summary: 'No recent news available' };
    }

    const avgSentiment = data.reduce((sum, item) => sum + (item.sentiment_score || 0), 0) / data.length;

    const highImpactNews = data.filter(n => n.impact_level === 'high').length;
    const summary = `${data.length} news articles analyzed (${highImpactNews} high-impact)`;

    return { sentiment: avgSentiment, count: data.length, summary };
  }

  private async getMacroEventsSummary(): Promise<string> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: marketData } = await supabase
      .from('market_indices')
      .select('index_name, change_percent')
      .gte('timestamp', twentyFourHoursAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    if (marketData && marketData.length > 0) {
      const sp500Change = marketData[0].change_percent;
      return `S&P 500: ${sp500Change > 0 ? '+' : ''}${sp500Change.toFixed(2)}% (24h)`;
    }

    return 'Limited macro data available';
  }

  private determinePredictionType(
    bullish: number,
    bearish: number,
    neutral: number,
    avgChange: number,
    newsSentiment: number
  ): 'positive' | 'neutral' | 'negative' {
    const totalCryptos = bullish + bearish + neutral;

    if (totalCryptos === 0) return 'neutral';

    const bullishPercent = (bullish / totalCryptos) * 100;
    const bearishPercent = (bearish / totalCryptos) * 100;

    const weightedScore = avgChange * 0.6 + newsSentiment * 0.4;

    if (bullishPercent >= 60 && weightedScore > 1) {
      return 'positive';
    } else if (bearishPercent >= 60 && weightedScore < -1) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  private calculateConfidence(
    bullish: number,
    bearish: number,
    neutral: number,
    avgChange: number,
    newsData: { sentiment: number; count: number }
  ): number {
    const totalCryptos = bullish + bearish + neutral;

    if (totalCryptos === 0) return 50;

    const dominantCount = Math.max(bullish, bearish, neutral);
    const consensusPercent = (dominantCount / totalCryptos) * 100;

    const priceVolatility = Math.abs(avgChange);
    const volatilityFactor = Math.min(priceVolatility / 5, 1);

    const newsConfidenceFactor = Math.min(newsData.count / 10, 1);

    let baseConfidence = consensusPercent * 0.5;
    baseConfidence += volatilityFactor * 20;
    baseConfidence += newsConfidenceFactor * 15;

    return Math.min(Math.max(baseConfidence, 50), 95);
  }

  private generateReasoning(
    predictionType: 'positive' | 'neutral' | 'negative',
    bullish: number,
    bearish: number,
    neutral: number,
    avgChange: number,
    newsData: { sentiment: number; count: number; summary: string },
    macroData: string
  ): string {
    const totalCryptos = bullish + bearish + neutral;
    const direction = predictionType === 'positive' ? 'upward' : predictionType === 'negative' ? 'downward' : 'sideways';

    let reasoning = `Overall market shows ${direction} trend. `;

    reasoning += `${bullish} of ${totalCryptos} top cryptocurrencies are bullish (+2%+), `;
    reasoning += `${bearish} are bearish (-2%+), and ${neutral} are neutral. `;

    reasoning += `Average price change: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%. `;

    if (newsData.count > 0) {
      const sentimentLabel = newsData.sentiment > 0.5 ? 'positive' : newsData.sentiment < -0.5 ? 'negative' : 'neutral';
      reasoning += `News sentiment is ${sentimentLabel} (${newsData.summary}). `;
    }

    reasoning += `${macroData}. `;

    if (predictionType === 'positive') {
      reasoning += 'Market conditions favor bullish momentum in the near term.';
    } else if (predictionType === 'negative') {
      reasoning += 'Market conditions suggest caution and potential downside risk.';
    } else {
      reasoning += 'Market shows mixed signals; consolidation likely.';
    }

    return reasoning;
  }

  async savePrediction(prediction: TrendPrediction): Promise<void> {
    const { error } = await supabase
      .from('market_trend_predictions')
      .insert({
        prediction_type: prediction.prediction_type,
        confidence_percent: prediction.confidence_percent,
        reasoning: prediction.reasoning,
        average_price_change: prediction.average_price_change,
        bullish_count: prediction.bullish_count,
        bearish_count: prediction.bearish_count,
        neutral_count: prediction.neutral_count,
        news_sentiment_score: prediction.news_sentiment_score,
        macro_events_summary: prediction.macro_events_summary,
      });

    if (error) {
      console.error('Error saving market trend prediction:', error);
    } else {
      console.log(`Market trend prediction saved: ${prediction.prediction_type} (${prediction.confidence_percent}% confidence)`);
    }
  }

  async getLatestPrediction() {
    const { data, error } = await supabase
      .from('market_trend_predictions')
      .select('*')
      .order('predicted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest prediction:', error);
      return null;
    }

    return data;
  }

  async getPredictionHistory(limit: number = 24) {
    const { data, error } = await supabase
      .from('market_trend_predictions')
      .select('*')
      .order('predicted_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching prediction history:', error);
      return [];
    }

    return data || [];
  }
}

export const marketTrendPredictor = new MarketTrendPredictor();
