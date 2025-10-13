import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoDetailModalProps {
  symbol: string;
  name: string;
  currentPrice: number;
  onClose: () => void;
}

interface PriceData {
  timestamp: string;
  price_usd: number;
}

interface TimeframeData {
  prices: PriceData[];
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

export function CryptoDetailModal({ symbol, name, currentPrice, onClose }: CryptoDetailModalProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<'24h' | '7d' | '30d' | '90d' | '6m' | '1y' | '5y'>('24h');
  const [data, setData] = useState<Record<string, TimeframeData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllTimeframes();
  }, [symbol]);

  async function loadAllTimeframes() {
    setLoading(true);
    const timeframes = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '6m': 180,
      '1y': 365,
      '5y': 1825,
    };

    const results: Record<string, TimeframeData> = {};

    for (const [key, days] of Object.entries(timeframes)) {
      const timeframeData = await loadTimeframeData(days);
      if (timeframeData) {
        results[key] = timeframeData;
      }
    }

    setData(results);
    setLoading(false);
  }

  async function loadTimeframeData(days: number): Promise<TimeframeData | null> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: prices, error } = await supabase
      .from('crypto_prices')
      .select('timestamp, price_usd')
      .eq('symbol', symbol)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error || !prices || prices.length === 0) {
      return null;
    }

    const priceData = prices.map(p => ({
      timestamp: p.timestamp,
      price_usd: Number(p.price_usd),
    }));

    const startPrice = priceData[0].price_usd;
    const endPrice = priceData[priceData.length - 1].price_usd;
    const change = endPrice - startPrice;
    const changePercent = (change / startPrice) * 100;

    const high = Math.max(...priceData.map(p => p.price_usd));
    const low = Math.min(...priceData.map(p => p.price_usd));

    return {
      prices: priceData,
      change,
      changePercent,
      high,
      low,
    };
  }

  function renderChart(timeframeData: TimeframeData) {
    const prices = timeframeData.prices;
    if (prices.length < 2) return null;

    const minPrice = Math.min(...prices.map(p => p.price_usd));
    const maxPrice = Math.max(...prices.map(p => p.price_usd));
    const priceRange = maxPrice - minPrice;

    const points = prices.map((point, index) => {
      const x = (index / (prices.length - 1)) * 100;
      const y = 100 - ((point.price_usd - minPrice) / priceRange) * 100;
      return `${x},${y}`;
    }).join(' ');

    const isPositive = timeframeData.changePercent >= 0;

    return (
      <div className="relative">
        <svg className="w-full h-64" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={`0,100 ${points} 100,100`}
            fill={`url(#gradient-${symbol})`}
          />
          <polyline
            points={points}
            fill="none"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="absolute top-0 left-0 right-0 flex justify-between text-xs text-slate-500 px-2">
          <span>${minPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span>${maxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  }

  const currentData = data[activeTimeframe];
  const isPositive = currentData?.changePercent >= 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              {symbol}
              <span className="text-slate-400 text-xl">{name}</span>
            </h2>
            <p className="text-3xl font-bold text-white mt-2">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {(['24h', '7d', '30d', '90d', '6m', '1y', '5y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTimeframe === tf
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading historical data...</p>
            </div>
          ) : currentData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Change</p>
                  <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}${Math.abs(currentData.change).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'} flex items-center gap-1`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isPositive ? '+' : ''}{currentData.changePercent.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">High</p>
                  <p className="text-2xl font-bold text-white">
                    ${currentData.high.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Low</p>
                  <p className="text-2xl font-bold text-white">
                    ${currentData.low.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Data Points</p>
                  <p className="text-2xl font-bold text-white">
                    {currentData.prices.length}
                  </p>
                  <p className="text-xs text-slate-500">prices</p>
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-6">
                {renderChart(currentData)}
              </div>

              <div className="mt-6 text-sm text-slate-400">
                <p>
                  <strong className="text-slate-300">Period:</strong> {activeTimeframe} •
                  <strong className="text-slate-300 ml-3">Range:</strong> $
                  {currentData.low.toLocaleString(undefined, { maximumFractionDigits: 2 })} - $
                  {currentData.high.toLocaleString(undefined, { maximumFractionDigits: 2 })} •
                  <strong className="text-slate-300 ml-3">Volatility:</strong> {
                    ((currentData.high - currentData.low) / currentData.low * 100).toFixed(2)
                  }%
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-400">No data available for this timeframe</p>
              <p className="text-sm text-slate-500 mt-2">Try loading historical data first</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
