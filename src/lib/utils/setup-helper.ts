import { supabase } from '../supabase';

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('crypto_prices').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function getDatabaseStats(): Promise<{
  cryptoPrices: number;
  newsEvents: number;
  marketIndices: number;
  recommendations: number;
}> {
  const [cryptoCount, newsCount, marketCount, recCount] = await Promise.all([
    supabase.from('crypto_prices').select('*', { count: 'exact', head: true }),
    supabase.from('news_events').select('*', { count: 'exact', head: true }),
    supabase.from('market_indices').select('*', { count: 'exact', head: true }),
    supabase.from('recommendations').select('*', { count: 'exact', head: true }),
  ]);

  return {
    cryptoPrices: cryptoCount.count || 0,
    newsEvents: newsCount.count || 0,
    marketIndices: marketCount.count || 0,
    recommendations: recCount.count || 0,
  };
}

export async function getApiUsageStats(): Promise<{
  coingecko: number;
  alphavantage: number;
  newsapi: number;
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [coingeckoCount, alphaCount, newsCount] = await Promise.all([
    supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_name', 'coingecko')
      .gte('called_at', oneDayAgo),
    supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_name', 'alphavantage')
      .gte('called_at', oneDayAgo),
    supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_name', 'newsapi')
      .gte('called_at', oneDayAgo),
  ]);

  return {
    coingecko: coingeckoCount.count || 0,
    alphavantage: alphaCount.count || 0,
    newsapi: newsCount.count || 0,
  };
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function getTimeSince(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';

  return Math.floor(seconds) + ' seconds ago';
}
