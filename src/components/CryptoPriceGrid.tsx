import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TOP_CRYPTOS } from '../lib/constants';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CryptoDetailModal } from './CryptoDetailModal';

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  volume: number;
  market_cap: number;
  timestamp: string;
  change24h?: number;
}

export function CryptoPriceGrid() {
  const [prices, setPrices] = useState<Map<string, CryptoPrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<{ symbol: string; name: string; price: number } | null>(null);

  useEffect(() => {
    loadPrices();
    const interval = setInterval(loadPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  async function loadPrices() {
    try {
      const symbols = TOP_CRYPTOS.map(c => c.symbol);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const pricePromises = symbols.map(async symbol => {
        // Get current price from crypto_5min_prices (latest record)
        const { data: current } = await supabase
          .from('crypto_5min_prices')
          .select('symbol, price, volume, market_cap, timestamp')
          .eq('symbol', symbol)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!current) return null;

        // Get price from 24 hours ago for change calculation
        const { data: old } = await supabase
          .from('crypto_5min_prices')
          .select('price')
          .eq('symbol', symbol)
          .lte('timestamp', twentyFourHoursAgo.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        const currentPrice = Number(current.price);
        let change24h = 0;

        if (old) {
          const oldPrice = Number(old.price);
          change24h = ((currentPrice - oldPrice) / oldPrice) * 100;
        }

        // Find the crypto name from TOP_CRYPTOS
        const cryptoInfo = TOP_CRYPTOS.find(c => c.symbol === symbol);

        return {
          symbol: current.symbol,
          name: cryptoInfo?.name || symbol,
          price: currentPrice,
          volume: Number(current.volume),
          market_cap: Number(current.market_cap),
          timestamp: current.timestamp,
          change24h,
        };
      });

      const results = await Promise.all(pricePromises);
      const priceMap = new Map<string, CryptoPrice>();

      results.forEach(price => {
        if (price) {
          priceMap.set(price.symbol, price);
        }
      });

      setPrices(priceMap);
    } catch (error) {
      console.error('Error loading prices:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Live Crypto Prices</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-slate-700 rounded mb-2"></div>
              <div className="h-6 bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Live Crypto Prices</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {TOP_CRYPTOS.map(crypto => {
            const price = prices.get(crypto.symbol);

            if (!price) {
              return (
                <div
                  key={crypto.symbol}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                >
                  <p className="text-sm font-medium text-slate-400">{crypto.symbol}</p>
                  <p className="text-xs text-slate-600">Loading...</p>
                </div>
              );
            }

            const change = price.change24h || 0;
            const isPositive = change >= 0;

            return (
              <button
                key={crypto.symbol}
                onClick={() => setSelectedCrypto({ symbol: crypto.symbol, name: crypto.name, price: price.price })}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-blue-500 hover:bg-slate-800 transition-all cursor-pointer text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-white">{crypto.symbol}</p>
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <p className="text-xl font-bold text-white mb-1">
                  ${price.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p
                  className={`text-xs font-medium ${
                    isPositive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {change.toFixed(2)}% 24h
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {selectedCrypto && (
        <CryptoDetailModal
          symbol={selectedCrypto.symbol}
          name={selectedCrypto.name}
          currentPrice={selectedCrypto.price}
          onClose={() => setSelectedCrypto(null)}
        />
      )}
    </>
  );
}
