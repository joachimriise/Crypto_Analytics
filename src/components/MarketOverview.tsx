import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface MarketIndex {
  index_name: string;
  value: number;
  change_percent: number | null;
  timestamp: string;
}

export function MarketOverview() {
  const [marketData, setMarketData] = useState<MarketIndex | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketData();
  }, []);

  async function loadMarketData() {
    try {
      const { data, error } = await supabase
        .from('market_indices')
        .select('*')
        .eq('index_name', 'SP500')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setMarketData(data);
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !marketData) {
    return null;
  }

  const changePercent = marketData.change_percent || 0;
  const isPositive = changePercent >= 0;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 rounded-lg p-3">
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Market Conditions</p>
            <h3 className="text-2xl font-bold text-white">S&P 500</h3>
          </div>
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold text-white">
            {marketData.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2 justify-end mt-1">
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <span
              className={`text-lg font-semibold ${
                isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
