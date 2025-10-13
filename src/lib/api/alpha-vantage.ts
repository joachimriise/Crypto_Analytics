import { rateLimiter } from './rate-limiter';
import { API_RATE_LIMITS } from '../constants';

const API_KEY = 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';
const API_NAME = 'alphavantage';

interface TimeSeriesData {
  [date: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
}

interface MarketIndexData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchSP500Data(): Promise<MarketIndexData[]> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerMinute: API_RATE_LIMITS.ALPHA_VANTAGE.CALLS_PER_MINUTE,
    callsPerDay: API_RATE_LIMITS.ALPHA_VANTAGE.CALLS_PER_DAY,
  });

  if (!canCall) {
    throw new Error('Alpha Vantage rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = 'TIME_SERIES_DAILY';

  try {
    const url = `${BASE_URL}?function=${endpoint}&symbol=SPY&apikey=${API_KEY}&outputsize=full`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (data['Note']) {
      throw new Error('Alpha Vantage API rate limit reached');
    }

    const timeSeries: TimeSeriesData = data['Time Series (Daily)'] || {};
    const marketData: MarketIndexData[] = Object.entries(timeSeries).map(([date, values]) => ({
      timestamp: date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseFloat(values['5. volume']),
    }));

    rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return marketData;
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

export async function fetchGlobalQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: string;
}> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerMinute: API_RATE_LIMITS.ALPHA_VANTAGE.CALLS_PER_MINUTE,
    callsPerDay: API_RATE_LIMITS.ALPHA_VANTAGE.CALLS_PER_DAY,
  });

  if (!canCall) {
    throw new Error('Alpha Vantage rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = 'GLOBAL_QUOTE';

  try {
    const url = `${BASE_URL}?function=${endpoint}&symbol=${symbol}&apikey=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (data['Note']) {
      throw new Error('Alpha Vantage API rate limit reached');
    }

    const quote = data['Global Quote'];

    rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return {
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'],
    };
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
