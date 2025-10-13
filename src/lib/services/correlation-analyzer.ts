import { supabase } from '../supabase';

interface NewsEvent {
  id: string;
  title: string;
  category: string;
  sentiment_score: number;
  impact_level: string;
  published_at: string;
}

interface CryptoPrice {
  symbol: string;
  price_usd: number;
  timestamp: string;
}

interface CorrelationPattern {
  event_type: string;
  event_id: string;
  crypto_symbol: string;
  price_change_percent: number;
  time_lag_hours: number;
  confidence_score: number;
  occurrence_count: number;
  event_timestamp: string;
}

export class CorrelationAnalyzer {
  private readonly TIME_WINDOWS = [1, 4, 12, 24, 48, 72, 168]; // hours to analyze after event

  async analyzeAllCorrelations(): Promise<void> {
    console.log('Starting correlation analysis...');

    const newsEvents = await this.getRecentNewsEvents(30);

    for (const event of newsEvents) {
      await this.analyzeEventImpact(event);
    }

    console.log(`Analyzed ${newsEvents.length} news events`);
  }

  private async getRecentNewsEvents(days: number): Promise<NewsEvent[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('news_events')
      .select('id, title, category, sentiment_score, impact_level, published_at')
      .gte('published_at', cutoffDate.toISOString())
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching news events:', error);
      return [];
    }

    return data || [];
  }

  private async analyzeEventImpact(event: NewsEvent): Promise<void> {
    const eventDate = new Date(event.published_at);

    const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC', 'AVAX', 'DOT'];

    for (const symbol of symbols) {
      const priceBeforeEvent = await this.getPriceAtTime(symbol, eventDate);

      if (!priceBeforeEvent) continue;

      for (const hoursAfter of this.TIME_WINDOWS) {
        const targetDate = new Date(eventDate);
        targetDate.setHours(targetDate.getHours() + hoursAfter);

        const priceAfterEvent = await this.getPriceAtTime(symbol, targetDate);

        if (!priceAfterEvent) continue;

        const priceChangePercent =
          ((priceAfterEvent.price_usd - priceBeforeEvent.price_usd) / priceBeforeEvent.price_usd) * 100;

        if (Math.abs(priceChangePercent) > 1) {
          await this.recordCorrelation({
            event_type: event.category,
            event_id: event.id,
            crypto_symbol: symbol,
            price_change_percent: priceChangePercent,
            time_lag_hours: hoursAfter,
            confidence_score: this.calculateConfidence(
              priceChangePercent,
              event.sentiment_score,
              event.impact_level
            ),
            occurrence_count: 1,
            event_timestamp: event.published_at,
          });
        }
      }
    }
  }

  private async getPriceAtTime(symbol: string, targetDate: Date): Promise<CryptoPrice | null> {
    const windowStart = new Date(targetDate);
    windowStart.setHours(windowStart.getHours() - 1);

    const windowEnd = new Date(targetDate);
    windowEnd.setHours(windowEnd.getHours() + 1);

    const { data, error } = await supabase
      .from('crypto_prices')
      .select('symbol, price_usd, timestamp')
      .eq('symbol', symbol)
      .gte('timestamp', windowStart.toISOString())
      .lte('timestamp', windowEnd.toISOString())
      .order('timestamp', { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  }

  private calculateConfidence(
    priceChange: number,
    sentimentScore: number,
    impactLevel: string
  ): number {
    let confidence = 0.5;

    const priceDirection = priceChange > 0 ? 1 : -1;
    const sentimentDirection = sentimentScore > 0 ? 1 : -1;

    if (priceDirection === sentimentDirection) {
      confidence += 0.2;
    }

    if (Math.abs(priceChange) > 5) confidence += 0.1;
    if (Math.abs(priceChange) > 10) confidence += 0.1;
    if (Math.abs(priceChange) > 20) confidence += 0.1;

    if (impactLevel === 'high') confidence += 0.2;
    if (impactLevel === 'medium') confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  private async recordCorrelation(pattern: CorrelationPattern): Promise<void> {
    const existing = await supabase
      .from('correlation_patterns')
      .select('id, occurrence_count')
      .eq('event_id', pattern.event_id)
      .eq('crypto_symbol', pattern.crypto_symbol)
      .eq('time_lag_hours', pattern.time_lag_hours)
      .single();

    if (existing.data) {
      await supabase
        .from('correlation_patterns')
        .update({
          occurrence_count: existing.data.occurrence_count + 1,
          confidence_score: Math.min(existing.data.occurrence_count * 0.05 + pattern.confidence_score, 0.95),
        })
        .eq('id', existing.data.id);
    } else {
      await supabase.from('correlation_patterns').insert([pattern]);
    }
  }

  async getStrongestCorrelations(
    eventCategory: string,
    minConfidence: number = 0.7
  ): Promise<CorrelationPattern[]> {
    const { data, error } = await supabase
      .from('correlation_patterns')
      .select('*')
      .eq('event_type', eventCategory)
      .gte('confidence_score', minConfidence)
      .order('confidence_score', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching correlations:', error);
      return [];
    }

    return data || [];
  }

  async predictPriceImpact(
    eventCategory: string,
    sentimentScore: number,
    impactLevel: string
  ): Promise<{ [symbol: string]: { prediction: number; confidence: number } }> {
    const correlations = await this.getStrongestCorrelations(eventCategory, 0.6);

    const predictions: { [symbol: string]: { prediction: number; confidence: number } } = {};

    for (const correlation of correlations) {
      if (!predictions[correlation.crypto_symbol]) {
        predictions[correlation.crypto_symbol] = {
          prediction: 0,
          confidence: 0,
        };
      }

      const sentimentMultiplier = sentimentScore / (correlation.price_change_percent > 0 ? 1 : -1);
      const adjustedPrediction = correlation.price_change_percent * sentimentMultiplier;

      predictions[correlation.crypto_symbol].prediction +=
        adjustedPrediction * correlation.confidence_score;
      predictions[correlation.crypto_symbol].confidence += correlation.confidence_score;
    }

    for (const symbol in predictions) {
      const count = correlations.filter(c => c.crypto_symbol === symbol).length;
      if (count > 0) {
        predictions[symbol].confidence /= count;
      }
    }

    return predictions;
  }
}

export const correlationAnalyzer = new CorrelationAnalyzer();
