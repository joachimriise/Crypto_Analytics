import { supabase } from '../supabase';
import { RECOMMENDATION_ACTIONS, TOP_CRYPTOS } from '../constants';
import { correlationAnalyzer } from './correlation-analyzer';

interface RecommendationInput {
  cryptoSymbol: string;
  recentNews: Array<{
    sentiment: number;
    category: string;
    impactLevel: string;
    publishedAt: string;
  }>;
  priceHistory: Array<{
    price: number;
    timestamp: string;
  }>;
  marketTrend: number;
}

interface Recommendation {
  cryptoSymbol: string;
  action: string;
  confidencePercent: number;
  reasoning: string;
  targetPrice?: number;
  stopLoss?: number;
}

export class RecommendationEngine {
  private calculatePriceChange(prices: Array<{ price: number }>): number {
    if (prices.length < 2) return 0;
    const latest = prices[0].price;
    const previous = prices[prices.length - 1].price;
    return ((latest - previous) / previous) * 100;
  }

  private calculateAverageSentiment(news: Array<{ sentiment: number; impactLevel: string }>): number {
    if (news.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    news.forEach(item => {
      const weight = item.impactLevel === 'high' ? 3 : item.impactLevel === 'medium' ? 2 : 1;
      weightedSum += item.sentiment * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  generateRecommendation(input: RecommendationInput): Recommendation {
    const { cryptoSymbol, recentNews, priceHistory, marketTrend } = input;

    const priceChange24h = this.calculatePriceChange(priceHistory.slice(0, 24));
    const priceChange7d = this.calculatePriceChange(priceHistory.slice(0, 168));
    const avgSentiment = this.calculateAverageSentiment(recentNews);

    const signals: { weight: number; direction: number; reason: string }[] = [];

    if (avgSentiment > 0.3) {
      signals.push({
        weight: 0.3,
        direction: 1,
        reason: `Positive news sentiment (${(avgSentiment * 100).toFixed(0)}%)`,
      });
    } else if (avgSentiment < -0.3) {
      signals.push({
        weight: 0.3,
        direction: -1,
        reason: `Negative news sentiment (${(avgSentiment * 100).toFixed(0)}%)`,
      });
    }

    if (priceChange24h > 10) {
      signals.push({
        weight: 0.2,
        direction: 1,
        reason: `Strong 24h price increase (+${priceChange24h.toFixed(1)}%)`,
      });
    } else if (priceChange24h < -10) {
      signals.push({
        weight: 0.25,
        direction: -1,
        reason: `Significant 24h price drop (${priceChange24h.toFixed(1)}%)`,
      });
    }

    if (priceChange7d > 20) {
      signals.push({
        weight: 0.15,
        direction: 1,
        reason: `Strong weekly momentum (+${priceChange7d.toFixed(1)}%)`,
      });
    } else if (priceChange7d < -20) {
      signals.push({
        weight: 0.2,
        direction: -1,
        reason: `Weak weekly performance (${priceChange7d.toFixed(1)}%)`,
      });
    }

    if (marketTrend > 2) {
      signals.push({
        weight: 0.15,
        direction: 1,
        reason: `Positive market conditions (S&P +${marketTrend.toFixed(1)}%)`,
      });
    } else if (marketTrend < -2) {
      signals.push({
        weight: 0.15,
        direction: -1,
        reason: `Negative market conditions (S&P ${marketTrend.toFixed(1)}%)`,
      });
    }

    const highImpactNegativeNews = recentNews.filter(
      n => n.impactLevel === 'high' && n.sentiment < -0.5
    );

    if (highImpactNegativeNews.length > 0) {
      signals.push({
        weight: 0.35,
        direction: -1,
        reason: `${highImpactNegativeNews.length} high-impact negative event(s)`,
      });
    }

    let totalScore = 0;
    let totalWeight = 0;

    signals.forEach(signal => {
      totalScore += signal.direction * signal.weight;
      totalWeight += signal.weight;
    });

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    let action: string;
    let confidence: number;

    if (normalizedScore > 0.25) {
      action = RECOMMENDATION_ACTIONS.BUY;
      confidence = Math.min(95, 50 + normalizedScore * 100);
    } else if (normalizedScore < -0.25) {
      action = RECOMMENDATION_ACTIONS.SELL;
      confidence = Math.min(95, 50 + Math.abs(normalizedScore) * 100);
    } else {
      action = RECOMMENDATION_ACTIONS.HOLD;
      confidence = Math.max(50, 75 - Math.abs(normalizedScore) * 100);
    }

    const reasoning = signals.map(s => s.reason).join('; ');

    const currentPrice = priceHistory[0]?.price || 0;
    let targetPrice: number | undefined;
    let stopLoss: number | undefined;

    if (action === RECOMMENDATION_ACTIONS.BUY) {
      targetPrice = currentPrice * 1.15;
      stopLoss = currentPrice * 0.92;
    } else if (action === RECOMMENDATION_ACTIONS.SELL) {
      stopLoss = currentPrice * 1.08;
    }

    return {
      cryptoSymbol,
      action,
      confidencePercent: Math.round(confidence),
      reasoning,
      targetPrice,
      stopLoss,
    };
  }

  async generateAllRecommendations(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    await correlationAnalyzer.analyzeAllCorrelations();

    const { data: marketData } = await supabase
      .from('market_indices')
      .select('value, change_percent')
      .eq('index_name', 'SP500')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const marketTrend = marketData?.change_percent || 0;

    for (const crypto of TOP_CRYPTOS) {
      const { data: recentNews } = await supabase
        .from('news_events')
        .select('sentiment_score, category, impact_level, published_at')
        .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('published_at', { ascending: false })
        .limit(50);

      const { data: priceHistory } = await supabase
        .from('crypto_prices')
        .select('price_usd, timestamp')
        .eq('symbol', crypto.symbol)
        .order('timestamp', { ascending: false })
        .limit(168);

      if (priceHistory && priceHistory.length > 0) {
        const recommendation = this.generateRecommendation({
          cryptoSymbol: crypto.symbol,
          recentNews: (recentNews || []).map(n => ({
            sentiment: n.sentiment_score || 0,
            category: n.category,
            impactLevel: n.impact_level || 'medium',
            publishedAt: n.published_at,
          })),
          priceHistory: priceHistory.map(p => ({
            price: Number(p.price_usd),
            timestamp: p.timestamp,
          })),
          marketTrend,
        });

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
    await supabase.from('recommendations').update({ is_active: false }).eq('is_active', true);

    const records = recommendations.map(rec => ({
      crypto_symbol: rec.cryptoSymbol,
      action: rec.action,
      confidence_percent: rec.confidencePercent,
      reasoning: rec.reasoning,
      target_price: rec.targetPrice,
      stop_loss: rec.stopLoss,
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { error } = await supabase.from('recommendations').insert(records);

    if (error) {
      console.error('Error saving recommendations:', error);
    }
  }
}

export const recommendationEngine = new RecommendationEngine();
