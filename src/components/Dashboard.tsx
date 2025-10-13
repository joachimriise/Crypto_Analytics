import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RecommendationCard } from './RecommendationCard';
import { NewsFeed } from './NewsFeed';
import { MarketOverview } from './MarketOverview';
import { CryptoPriceGrid } from './CryptoPriceGrid';
import { MarketTrendPrediction } from './MarketTrendPrediction';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { dataCollectorService } from '../lib/services/data-collector';
import { recommendationEngine } from '../lib/services/recommendation-engine';
import { marketTrendPredictor } from '../lib/services/market-trend-predictor';

interface Recommendation {
  id: string;
  crypto_symbol: string;
  action: string;
  confidence_percent: number;
  reasoning: string;
  target_price: number | null;
  stop_loss: number | null;
  generated_at: string;
}

export function Dashboard() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  useEffect(() => {
    initializeData();

    const priceInterval = setInterval(() => {
      collectLivePrices();
    }, 60 * 1000);

    const recommendationInterval = setInterval(() => {
      refreshRecommendations();
    }, 5 * 60 * 1000);

    const marketTrendInterval = setInterval(() => {
      generateMarketTrend();
    }, 60 * 60 * 1000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(recommendationInterval);
      clearInterval(marketTrendInterval);
    };
  }, []);

  async function initializeData() {
    setLoading(true);

    const { count } = await supabase
      .from('crypto_prices')
      .select('*', { count: 'exact', head: true });

    if (!count || count === 0) {
      console.log('No data found, collecting initial data...');
      await collectAndGenerate();
    } else {
      await loadRecommendations();
    }

    setLoading(false);
  }

  async function collectLivePrices() {
    try {
      await dataCollectorService.collectCurrentCryptoPrices();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error collecting live prices:', error);
    }
  }

  async function refreshRecommendations() {
    try {
      await dataCollectorService.collectLatestNews();

      const recs = await recommendationEngine.generateAllRecommendations();
      await recommendationEngine.saveRecommendations(recs);

      await loadRecommendations();
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
    }
  }

  async function generateMarketTrend() {
    try {
      const prediction = await marketTrendPredictor.generateMarketTrendPrediction();
      await marketTrendPredictor.savePrediction(prediction);
      console.log('Market trend prediction generated:', prediction.prediction_type);
    } catch (error) {
      console.error('Error generating market trend:', error);
    }
  }

  async function refreshData() {
    if (autoRefreshing) return;

    setAutoRefreshing(true);
    try {
      await dataCollectorService.collectCurrentCryptoPrices();
      await dataCollectorService.collectLatestNews();

      const recs = await recommendationEngine.generateAllRecommendations();
      await recommendationEngine.saveRecommendations(recs);

      await loadRecommendations();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setAutoRefreshing(false);
    }
  }

  async function collectAndGenerate() {
    try {
      await dataCollectorService.collectCurrentCryptoPrices();
      await dataCollectorService.collectLatestNews();

      const recs = await recommendationEngine.generateAllRecommendations();
      await recommendationEngine.saveRecommendations(recs);

      const prediction = await marketTrendPredictor.generateMarketTrendPrediction();
      await marketTrendPredictor.savePrediction(prediction);

      await loadRecommendations();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error collecting data:', error);
    }
  }

  async function loadRecommendations() {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('is_active', true)
        .order('confidence_percent', { ascending: false });

      if (error) throw error;

      setRecommendations(data || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  }

  const buyRecommendations = recommendations.filter(r => r.action === 'BUY');
  const sellRecommendations = recommendations.filter(r => r.action === 'SELL');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <TrendingUp className="w-10 h-10 text-emerald-400" />
                Crypto Analytics Engine
              </h1>
              <p className="text-slate-400">
                Live price updates every minute • Recommendations refresh every 5 minutes
              </p>
            </div>
            <div className="text-right">
              <button
                onClick={refreshData}
                disabled={autoRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 mb-2"
              >
                <RefreshCw className={`w-4 h-4 ${autoRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <p className="text-sm text-slate-400">Last updated</p>
              <p className="text-white font-medium">{lastUpdate.toLocaleTimeString()}</p>
            </div>
          </div>
        </header>

        <MarketOverview />

        <div className="mb-8">
          <MarketTrendPrediction />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading market data...</p>
            </div>
          </div>
        ) : (
          <>
            {buyRecommendations.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-8 bg-emerald-500 rounded"></div>
                  <h2 className="text-2xl font-bold text-white">Buy Opportunities</h2>
                  <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                    {buyRecommendations.length} Active
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buyRecommendations.map(rec => (
                    <RecommendationCard key={rec.id} recommendation={rec} />
                  ))}
                </div>
              </section>
            )}

            {sellRecommendations.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-8 bg-red-500 rounded"></div>
                  <h2 className="text-2xl font-bold text-white">Sell Signals</h2>
                  <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                    {sellRecommendations.length} Active
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sellRecommendations.map(rec => (
                    <RecommendationCard key={rec.id} recommendation={rec} />
                  ))}
                </div>
              </section>
            )}

            <CryptoPriceGrid />

            <div className="mt-8">
              <NewsFeed />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
