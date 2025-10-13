import { rateLimiter } from './rate-limiter';

const API_KEY = import.meta.env.VITE_LIVECOINWATCH_API_KEY || 'demo';
const BASE_URL = 'https://api.livecoinwatch.com';
const API_NAME = 'livecoinwatch';

interface LiveCoinWatchCoin {
  code: string;
  name: string;
  rate: number;
  volume: number;
  cap: number;
  delta?: {
    hour?: number;
    day?: number;
    week?: number;
    month?: number;
  };
}

interface HistoricalPrice {
  date: number;
  rate: number;
}

export async function fetchCurrentPrices(coinCodes: string[]): Promise<LiveCoinWatchCoin[]> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerDay: 10000,
  });

  if (!canCall) {
    throw new Error('LiveCoinWatch rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = '/coins/list';

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        currency: 'USD',
        sort: 'rank',
        order: 'ascending',
        offset: 0,
        limit: 100,
        meta: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`LiveCoinWatch API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    await rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return data.filter((coin: LiveCoinWatchCoin) => coinCodes.includes(coin.code));
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

export async function fetchSingleCoin(coinCode: string): Promise<LiveCoinWatchCoin> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerDay: 10000,
  });

  if (!canCall) {
    throw new Error('LiveCoinWatch rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = '/coins/single';

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        currency: 'USD',
        code: coinCode,
        meta: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`LiveCoinWatch API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    await rateLimiter.recordCall(API_NAME);
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

export async function fetchHistoricalPrices(
  coinCode: string,
  startDate: number,
  endDate: number
): Promise<HistoricalPrice[]> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerDay: 10000,
  });

  if (!canCall) {
    throw new Error('LiveCoinWatch rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = '/coins/single/history';

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        currency: 'USD',
        code: coinCode,
        start: startDate,
        end: endDate,
        meta: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`LiveCoinWatch API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    await rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return data.history || [];
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

export async function checkApiCredits(): Promise<{ dailyCreditsRemaining: number; dailyCreditsLimit: number }> {
  try {
    const response = await fetch(`${BASE_URL}/credits`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`LiveCoinWatch API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      dailyCreditsRemaining: data.dailyCreditsRemaining || 0,
      dailyCreditsLimit: data.dailyCreditsLimit || 10000,
    };
  } catch (error) {
    console.error('Error checking API credits:', error);
    return { dailyCreditsRemaining: 0, dailyCreditsLimit: 10000 };
  }
}
