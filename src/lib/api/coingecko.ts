import { rateLimiter } from './rate-limiter';
import { API_RATE_LIMITS } from '../constants';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const API_NAME = 'coingecko';

interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
}

interface HistoricalData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export async function fetchCurrentPrices(coinIds: string[]): Promise<CoinGeckoPrice[]> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerMinute: API_RATE_LIMITS.COINGECKO.CALLS_PER_MINUTE,
    callsPerMonth: API_RATE_LIMITS.COINGECKO.CALLS_PER_MONTH,
  });

  if (!canCall) {
    throw new Error('CoinGecko rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = '/coins/markets';

  try {
    const idsParam = coinIds.join(',');
    const url = `${COINGECKO_BASE_URL}${endpoint}?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&sparkline=false`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return data;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await rateLimiter.logApiCall(
      API_NAME,
      endpoint,
      false,
      responseTime,
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

export async function fetchHistoricalData(
  coinId: string,
  days: number
): Promise<HistoricalData> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerMinute: API_RATE_LIMITS.COINGECKO.CALLS_PER_MINUTE,
    callsPerMonth: API_RATE_LIMITS.COINGECKO.CALLS_PER_MONTH,
  });

  if (!canCall) {
    throw new Error('CoinGecko rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = `/coins/${coinId}/market_chart`;

  try {
    const url = `${COINGECKO_BASE_URL}${endpoint}?vs_currency=usd&days=${days}&interval=daily`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return data;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await rateLimiter.logApiCall(
      API_NAME,
      endpoint,
      false,
      responseTime,
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

export async function fetchOHLCData(
  coinId: string,
  days: number
): Promise<[number, number, number, number, number][]> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerMinute: API_RATE_LIMITS.COINGECKO.CALLS_PER_MINUTE,
    callsPerMonth: API_RATE_LIMITS.COINGECKO.CALLS_PER_MONTH,
  });

  if (!canCall) {
    throw new Error('CoinGecko rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = `/coins/${coinId}/ohlc`;

  try {
    const url = `${COINGECKO_BASE_URL}${endpoint}?vs_currency=usd&days=${days}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return data;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await rateLimiter.logApiCall(
      API_NAME,
      endpoint,
      false,
      responseTime,
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}
