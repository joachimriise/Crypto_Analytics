import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PricePoint {
  timestamp: string;
  price_usd: number;
}

interface TrendData {
  symbol: string;
  name: string;
  prices: PricePoint[];
  currentPrice: number;
  change24h: number;
  changePercent: number;
}

export function LiveTrendChart() {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendData();

    const interval = setInterval(() => {
      loadTrendData();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadTrendData() {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('crypto_prices')
        .select('symbol, name, timestamp, price_usd')
        .gte('timestamp', twentyFourHoursAgo.toISOString())
        .order('symbol')
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const groupedBySymbol = new Map<string, PricePoint[]>();
      const names = new Map<string, string>();

      data?.forEach(point => {
        if (!groupedBySymbol.has(point.symbol)) {
          groupedBySymbol.set(point.symbol, []);
          names.set(point.symbol, point.name);
        }
        groupedBySymbol.get(point.symbol)!.push({
          timestamp: point.timestamp,
          price_usd: point.price_usd,
        });
      });

      const trends: TrendData[] = [];
      groupedBySymbol.forEach((prices, symbol) => {
        if (prices.length > 0) {
          const currentPrice = prices[prices.length - 1].price_usd;
          const startPrice = prices[0].price_usd;
          const change24h = currentPrice - startPrice;
          const changePercent = (change24h / startPrice) * 100;

          trends.push({
            symbol,
            name: names.get(symbol) || symbol,
            prices,
            currentPrice,
            change24h,
            changePercent,
          });
        }
      });

      trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      setTrendData(trends);
      setLoading(false);
    } catch (error) {
      console.error('Error loading trend data:', error);
      setLoading(false);
    }
  }

  function renderMiniChart(prices: PricePoint[], isPositive: boolean) {
    if (prices.length < 2) return null;

    const minPrice = Math.min(...prices.map(p => p.price_usd));
    const maxPrice = Math.max(...prices.map(p => p.price_usd));
    const priceRange = maxPrice - minPrice;

    const points = prices.map((point, index) => {
      const x = (index / (prices.length - 1)) * 100;
      const y = 100 - ((point.price_usd - minPrice) / priceRange) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-8 bg-blue-500 rounded"></div>
        <div>
          <h2 className="text-2xl font-bold text-white">Live 24-Hour Trends</h2>
          <p className="text-sm text-slate-400">Updates every minute</p>
        </div>
      </div>

      {trendData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400">No live data yet. Collecting prices every minute...</p>
          <p className="text-sm text-slate-500 mt-2">
            Data will appear as prices are collected over the next 24 hours
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trendData.slice(0, 6).map(trend => {
            const isPositive = trend.changePercent >= 0;
            return (
              <div
                key={trend.symbol}
                className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-white">{trend.symbol}</div>
                    <div className="text-sm text-slate-400">{trend.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      ${trend.currentPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      isPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {isPositive ? '+' : ''}{trend.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  {renderMiniChart(trend.prices, isPositive)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {trend.prices.length} data points over 24 hours
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
