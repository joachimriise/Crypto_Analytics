import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Minus, Clock, History } from 'lucide-react';

interface Prediction {
  id: string;
  prediction_type: 'positive' | 'neutral' | 'negative';
  confidence_percent: number;
  reasoning: string;
  average_price_change: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  news_sentiment_score: number;
  macro_events_summary: string;
  predicted_at: string;
}

export function MarketTrendPrediction() {
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [history, setHistory] = useState<Prediction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrediction();

    const interval = setInterval(() => {
      loadPrediction();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadPrediction() {
    try {
      const { data: current } = await supabase
        .from('market_trend_predictions')
        .select('*')
        .order('predicted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentPrediction(current);

      const { data: historyData } = await supabase
        .from('market_trend_predictions')
        .select('*')
        .order('predicted_at', { ascending: false })
        .limit(24);

      setHistory(historyData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading market prediction:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-64 mb-4"></div>
          <div className="h-24 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!currentPrediction) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-8 bg-purple-500 rounded"></div>
          <h2 className="text-2xl font-bold text-white">Overall Market Trend</h2>
        </div>
        <p className="text-slate-400">Generating initial prediction...</p>
      </div>
    );
  }

  const trendConfig = {
    positive: {
      icon: TrendingUp,
      color: 'emerald',
      label: 'Bullish',
      bgGradient: 'from-emerald-500/20 to-emerald-600/10',
    },
    neutral: {
      icon: Minus,
      color: 'slate',
      label: 'Neutral',
      bgGradient: 'from-slate-500/20 to-slate-600/10',
    },
    negative: {
      icon: TrendingDown,
      color: 'red',
      label: 'Bearish',
      bgGradient: 'from-red-500/20 to-red-600/10',
    },
  };

  const config = trendConfig[currentPrediction.prediction_type];
  const TrendIcon = config.icon;

  const timeSince = new Date().getTime() - new Date(currentPrediction.predicted_at).getTime();
  const minutesAgo = Math.floor(timeSince / 1000 / 60);
  const timeDisplay = minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-8 bg-${config.color}-500 rounded`}></div>
          <div>
            <h2 className="text-2xl font-bold text-white">Overall Market Trend</h2>
            <p className="text-sm text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updates hourly • Last: {timeDisplay}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Hide' : 'Show'} History
        </button>
      </div>

      <div className={`bg-gradient-to-br ${config.bgGradient} border border-${config.color}-500/30 rounded-lg p-6 mb-4`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <TrendIcon className={`w-12 h-12 text-${config.color}-400`} />
            <div>
              <div className="text-3xl font-bold text-white">{config.label}</div>
              <div className={`text-lg text-${config.color}-400`}>
                {currentPrediction.confidence_percent.toFixed(0)}% confidence
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${currentPrediction.average_price_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {currentPrediction.average_price_change > 0 ? '+' : ''}
              {currentPrediction.average_price_change.toFixed(2)}%
            </div>
            <div className="text-sm text-slate-400">Avg 24h change</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-emerald-400 text-2xl font-bold">{currentPrediction.bullish_count}</div>
            <div className="text-xs text-slate-400">Bullish</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-slate-400 text-2xl font-bold">{currentPrediction.neutral_count}</div>
            <div className="text-xs text-slate-400">Neutral</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-red-400 text-2xl font-bold">{currentPrediction.bearish_count}</div>
            <div className="text-xs text-slate-400">Bearish</div>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="text-sm text-slate-300 leading-relaxed">
            {currentPrediction.reasoning}
          </div>
        </div>

        {currentPrediction.macro_events_summary && (
          <div className="mt-3 text-xs text-slate-400">
            {currentPrediction.macro_events_summary}
          </div>
        )}
      </div>

      {showHistory && history.length > 1 && (
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-lg font-semibold text-white mb-3">Prediction History (Last 24 Hours)</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.slice(1).map((pred) => {
              const histConfig = trendConfig[pred.prediction_type];
              const HistIcon = histConfig.icon;
              const predTime = new Date(pred.predicted_at);

              return (
                <div
                  key={pred.id}
                  className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <HistIcon className={`w-5 h-5 text-${histConfig.color}-400`} />
                    <div>
                      <div className="text-white font-medium">{histConfig.label}</div>
                      <div className="text-xs text-slate-400">
                        {predTime.toLocaleTimeString()} • {pred.confidence_percent.toFixed(0)}% confidence
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${pred.average_price_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pred.average_price_change > 0 ? '+' : ''}{pred.average_price_change.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-500">
                      {pred.bullish_count}↑ {pred.bearish_count}↓
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
