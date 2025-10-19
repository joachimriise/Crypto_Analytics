import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, TrendingUp, TrendingDown, Activity, BarChart3, Target } from 'lucide-react';

interface CryptoDetailModalProps {
  symbol: string;
  name: string;
  currentPrice: number;
  onClose: () => void;
}

interface PriceData {
  timestamp: string;
  price: number;
}

interface TimeframeData {
  prices: PriceData[];
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volatility: number;
  avgPrice: number;
}

interface TechnicalIndicators {
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  momentum: number | null;
  priceVsSma20: number | null;
  priceVsSma50: number | null;
}

export function CryptoDetailModal({ symbol, name, currentPrice, onClose }: CryptoDetailModalProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<'1h' | '24h' | '7d' | '30d' | '90d' | '1y' | '5y'>('24h');
  const [data, setData] = useState<Record<string, TimeframeData>>({});
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [symbol]);

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadAllTimeframes(),
        loadTechnicalIndicators()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load price data');
    } finally {
      setLoading(false);
    }
  }

  async function loadAllTimeframes() {
    const timeframes = {
      '1h': { hours: 1, useIntraday: true },
      '24h': { hours: 24, useIntraday: true },
      '7d': { days: 7, useIntraday: true },
      '30d': { days: 30, useIntraday: false },
      '90d': { days: 90, useIntraday: false },
      '1y': { days: 365, useIntraday: false },
      '5y': { days: 1825, useIntraday: false },
    };

    const results: Record<string, TimeframeData> = {};

    for (const [key, config] of Object.entries(timeframes)) {
      try {
        const timeframeData = await loadTimeframeData(config);
        if (timeframeData) {
          results[key] = timeframeData;
        }
      } catch (err) {
        console.error(`Error loading timeframe ${key}:`, err);
      }
    }

    setData(results);
  }

  async function loadTimeframeData(config: { hours?: number; days?: number; useIntraday: boolean }): Promise<TimeframeData | null> {
    let query;
    let startDate = new Date();

    if (config.hours) {
      // Use crypto_5min_prices for hourly/daily intraday data
      startDate.setHours(startDate.getHours() - config.hours);
      
      query = supabase
        .from('crypto_5min_prices')
        .select('timestamp, price')
        .eq('symbol', symbol)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
    } else if (config.days && config.useIntraday && config.days <= 7) {
      // Use crypto_5min_prices for 7-day intraday
      startDate.setDate(startDate.getDate() - config.days);
      
      query = supabase
        .from('crypto_5min_prices')
        .select('timestamp, price')
        .eq('symbol', symbol)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
    } else {
      // Use crypto_daily_prices for longer periods
      startDate.setDate(startDate.getDate() - (config.days || 30));
      
      const { data: dailyData, error } = await supabase
        .from('crypto_daily_prices')
        .select('date, close')
        .eq('symbol', symbol)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching daily data:', error);
        return null;
      }
      
      if (!dailyData || dailyData.length === 0) {
        return null;
      }

      const prices = dailyData.map(p => ({
        timestamp: p.date,
        price: Number(p.price),
      }));

      return calculateMetrics(prices);
    }

    const { data: prices, error } = await query;

    if (error) {
      console.error('Error fetching price data:', error);
      return null;
    }

    if (!prices || prices.length === 0) {
      return null;
    }

    const priceData = prices.map(p => ({
      timestamp: p.timestamp,
      price: Number(p.price),
    }));

    return calculateMetrics(priceData);
  }

  function calculateMetrics(prices: PriceData[]): TimeframeData {
    const priceValues = prices.map(p => p.price);
    const startPrice = priceValues[0];
    const endPrice = priceValues[priceValues.length - 1];
    const change = endPrice - startPrice;
    const changePercent = (change / startPrice) * 100;

    const high = Math.max(...priceValues);
    const low = Math.min(...priceValues);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const volatility = ((high - low) / low) * 100;

    return {
      prices,
      change,
      changePercent,
      high,
      low,
      volatility,
      avgPrice,
    };
  }

  async function loadTechnicalIndicators() {
    try {
      // Fetch last 200 data points for technical analysis
      const { data: recentPrices, error } = await supabase
        .from('crypto_5min_prices')
        .select('price')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error fetching technical indicators:', error);
        setIndicators(null);
        return;
      }

      if (!recentPrices || recentPrices.length < 14) {
        setIndicators(null);
        return;
      }

      const prices = recentPrices.map(p => Number(p.price)).reverse();

      // Calculate RSI (14-period)
      const rsi = calculateRSI(prices, 14);

      // Calculate SMAs
      const sma20 = prices.length >= 20 ? calculateSMA(prices, 20) : null;
      const sma50 = prices.length >= 50 ? calculateSMA(prices, 50) : null;
      const sma200 = prices.length >= 200 ? calculateSMA(prices, 200) : null;

      // Calculate momentum (10-period rate of change)
      const momentum = prices.length >= 10
        ? ((prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10]) * 100
        : null;

      // Price vs SMA analysis
      const priceVsSma20 = sma20 ? ((currentPrice - sma20) / sma20) * 100 : null;
      const priceVsSma50 = sma50 ? ((currentPrice - sma50) / sma50) * 100 : null;

      setIndicators({
        rsi,
        sma20,
        sma50,
        sma200,
        momentum,
        priceVsSma20,
        priceVsSma50,
      });
    } catch (err) {
      console.error('Error loading technical indicators:', err);
      setIndicators(null);
    }
  }

  function calculateRSI(prices: number[], period: number = 14): number | null {
    if (prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI for remaining prices
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  function calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  function getRSISignal(rsi: number): { text: string; color: string } {
    if (rsi >= 70) return { text: 'Overbought', color: 'text-red-400' };
    if (rsi <= 30) return { text: 'Oversold', color: 'text-emerald-400' };
    return { text: 'Neutral', color: 'text-slate-400' };
  }

  function getTrendSignal(priceVsSma: number | null): { text: string; color: string } {
    if (priceVsSma === null || priceVsSma === undefined) return { text: 'N/A', color: 'text-slate-500' };
    if (priceVsSma > 2) return { text: 'Strong Uptrend', color: 'text-emerald-400' };
    if (priceVsSma > 0) return { text: 'Uptrend', color: 'text-emerald-300' };
    if (priceVsSma > -2) return { text: 'Downtrend', color: 'text-red-300' };
    return { text: 'Strong Downtrend', color: 'text-red-400' };
  }

  function renderChart(timeframeData: TimeframeData) {
    const prices = timeframeData.prices;
    if (prices.length < 2) return null;

    const minPrice = Math.min(...prices.map(p => p.price));
    const maxPrice = Math.max(...prices.map(p => p.price));
    const priceRange = maxPrice - minPrice;

    const points = prices.map((point, index) => {
      const x = (index / (prices.length - 1)) * 100;
      const y = 100 - ((point.price - minPrice) / priceRange) * 100;
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
      </div>
    );
  }

  const currentData = data[activeTimeframe];
  const isPositive = currentData?.changePercent >= 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between z-10">
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
          {/* Timeframe Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {(['1h', '24h', '7d', '30d', '90d', '1y', '5y'] as const).map((tf) => (
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading data and calculating indicators...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Chart Section */}
              <div className="lg:col-span-2">
                {currentData ? (
                  <>
                    {/* Price Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Change ({activeTimeframe})</p>
                        <p className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}${Math.abs(currentData.change).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'} flex items-center gap-1`}>
                          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isPositive ? '+' : ''}{currentData.changePercent.toFixed(2)}%
                        </p>
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">High</p>
                        <p className="text-lg font-bold text-white">
                          ${currentData.high.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Low</p>
                        <p className="text-lg font-bold text-white">
                          ${currentData.low.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Volatility</p>
                        <p className="text-lg font-bold text-white">
                          {currentData.volatility.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-slate-700/30 rounded-lg p-6 mb-4">
                      {renderChart(currentData)}
                    </div>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-700/30 rounded-lg p-3">
                        <p className="text-slate-400 mb-1">Average Price</p>
                        <p className="text-white font-medium">
                          ${currentData.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-3">
                        <p className="text-slate-400 mb-1">Data Points</p>
                        <p className="text-white font-medium">{currentData.prices.length} prices</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 bg-slate-700/30 rounded-lg">
                    <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No data available for this timeframe</p>
                    <p className="text-sm text-slate-500 mt-2">Try running fetch-historical-prices</p>
                  </div>
                )}
              </div>

              {/* Technical Analysis Panel */}
              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Technical Indicators
                  </h3>

                  {indicators ? (
                    <div className="space-y-3">
                      {/* RSI */}
                      {indicators.rsi !== null && (
                        <div className="bg-slate-800/50 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400">RSI (14)</span>
                            <span className={`text-xs font-medium ${getRSISignal(indicators.rsi).color}`}>
                              {getRSISignal(indicators.rsi).text}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500"
                                style={{ width: `${indicators.rsi}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-white">{indicators.rsi.toFixed(1)}</span>
                          </div>
                        </div>
                      )}

                      {/* Moving Averages */}
                      <div className="bg-slate-800/50 rounded p-3">
                        <p className="text-xs text-slate-400 mb-2">Moving Averages</p>
                        <div className="space-y-1.5 text-xs">
                          {indicators.sma20 !== null && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">SMA 20:</span>
                              <span className="text-white font-medium">
                                ${indicators.sma20.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {indicators.sma50 !== null && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">SMA 50:</span>
                              <span className="text-white font-medium">
                                ${indicators.sma50.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {indicators.sma200 !== null && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">SMA 200:</span>
                              <span className="text-white font-medium">
                                ${indicators.sma200.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Trend Analysis */}
                      {indicators.priceVsSma20 !== null && (
                        <div className="bg-slate-800/50 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400">Trend (vs SMA 20)</span>
                            <span className={`text-xs font-medium ${getTrendSignal(indicators.priceVsSma20).color}`}>
                              {getTrendSignal(indicators.priceVsSma20).text}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Price is{' '}
                            <span className={indicators.priceVsSma20 >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {indicators.priceVsSma20 >= 0 ? '+' : ''}{indicators.priceVsSma20.toFixed(2)}%
                            </span>
                            {' '}vs 20-period average
                          </p>
                        </div>
                      )}

                      {/* Momentum */}
                      {indicators.momentum !== null && (
                        <div className="bg-slate-800/50 rounded p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Momentum (10-period)</span>
                            <span className={`text-sm font-bold ${
                              indicators.momentum >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {indicators.momentum >= 0 ? '+' : ''}{indicators.momentum.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Insufficient data for indicators</p>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-white mb-3">Quick Analysis</h3>
                  <div className="space-y-2 text-xs">
                    {indicators?.rsi !== null && typeof indicators?.rsi === 'number' && (
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1 ${
                          indicators.rsi >= 70 ? 'bg-red-400' :
                          indicators.rsi <= 30 ? 'bg-emerald-400' : 'bg-slate-400'
                        }`} />
                        <p className="text-slate-300 flex-1">
                          {indicators.rsi >= 70 ? 'Potentially overbought - consider taking profits' :
                           indicators.rsi <= 30 ? 'Potentially oversold - may be a buying opportunity' :
                           'RSI in neutral zone - no strong signal'}
                        </p>
                      </div>
                    )}
                    {currentData && (
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1 ${
                          currentData.volatility > 10 ? 'bg-yellow-400' : 'bg-blue-400'
                        }`} />
                        <p className="text-slate-300 flex-1">
                          {currentData.volatility > 10 
                            ? `High volatility (${currentData.volatility.toFixed(1)}%) - expect larger price swings`
                            : `Moderate volatility (${currentData.volatility.toFixed(1)}%) - relatively stable`
                          }
                        </p>
                      </div>
                    )}
                    {indicators?.priceVsSma20 !== null && typeof indicators?.priceVsSma20 === 'number' && (
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1 ${
                          Math.abs(indicators.priceVsSma20) > 5 ? 'bg-purple-400' : 'bg-slate-400'
                        }`} />
                        <p className="text-slate-300 flex-1">
                          {Math.abs(indicators.priceVsSma20) > 5
                            ? `Price ${indicators.priceVsSma20 > 0 ? 'significantly above' : 'significantly below'} average - potential reversal zone`
                            : 'Price trading near moving average - wait for clearer signal'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
