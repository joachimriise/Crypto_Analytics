import { rateLimiter } from './rate-limiter';
import { API_RATE_LIMITS } from '../constants';

const API_KEY = 'demo';
const BASE_URL = 'https://newsapi.org/v2';
const API_NAME = 'newsapi';

interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export async function fetchFinancialNews(
  query: string = 'cryptocurrency OR bitcoin OR tariff OR "federal reserve" OR "interest rates" OR "fed policy" OR inflation OR "trade war" OR recession OR "stock market crash" OR geopolitics OR war OR sanctions OR "oil prices" OR "dollar strength"',
  pageSize: number = 20
): Promise<NewsArticle[]> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerDay: API_RATE_LIMITS.NEWSAPI.CALLS_PER_DAY,
  });

  if (!canCall) {
    throw new Error('NewsAPI rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = '/everything';

  try {
    const url = `${BASE_URL}${endpoint}?q=${encodeURIComponent(query)}&apiKey=${API_KEY}&pageSize=${pageSize}&sortBy=publishedAt&language=en`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data: NewsResponse = await response.json();
    const responseTime = Date.now() - startTime;

    if (data.status !== 'ok') {
      throw new Error('NewsAPI returned error status');
    }

    rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return data.articles;
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

export async function fetchTopHeadlines(
  category: string = 'business',
  pageSize: number = 20
): Promise<NewsArticle[]> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerDay: API_RATE_LIMITS.NEWSAPI.CALLS_PER_DAY,
  });

  if (!canCall) {
    throw new Error('NewsAPI rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = '/top-headlines';

  try {
    const url = `${BASE_URL}${endpoint}?category=${category}&apiKey=${API_KEY}&pageSize=${pageSize}&language=en&country=us`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data: NewsResponse = await response.json();
    const responseTime = Date.now() - startTime;

    if (data.status !== 'ok') {
      throw new Error('NewsAPI returned error status');
    }

    rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return data.articles;
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

export async function fetchHistoricalNews(
  query: string,
  fromDate: string,
  toDate: string,
  pageSize: number = 20
): Promise<NewsArticle[]> {
  const canCall = await rateLimiter.canMakeCall(API_NAME, {
    callsPerDay: API_RATE_LIMITS.NEWSAPI.CALLS_PER_DAY,
  });

  if (!canCall) {
    throw new Error('NewsAPI rate limit exceeded');
  }

  const startTime = Date.now();
  const endpoint = '/everything';

  try {
    const url = `${BASE_URL}${endpoint}?q=${encodeURIComponent(query)}&from=${fromDate}&to=${toDate}&apiKey=${API_KEY}&pageSize=${pageSize}&sortBy=publishedAt&language=en`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data: NewsResponse = await response.json();
    const responseTime = Date.now() - startTime;

    if (data.status !== 'ok') {
      throw new Error('NewsAPI returned error status');
    }

    rateLimiter.recordCall(API_NAME);
    await rateLimiter.logApiCall(API_NAME, endpoint, true, responseTime);

    return data.articles;
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
