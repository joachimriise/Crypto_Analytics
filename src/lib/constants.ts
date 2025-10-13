export const TOP_CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
] as const;

export const EVENT_CATEGORIES = {
  TARIFF: 'tariff',
  REGULATION: 'regulation',
  ADOPTION: 'adoption',
  SECURITY: 'security',
  FED_POLICY: 'fed_policy',
  POLITICAL: 'political',
  TECH: 'tech',
  MARKET: 'market',
} as const;

export const IMPACT_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const RECOMMENDATION_ACTIONS = {
  BUY: 'BUY',
  SELL: 'SELL',
  HOLD: 'HOLD',
} as const;

export const API_RATE_LIMITS = {
  COINGECKO: {
    CALLS_PER_MINUTE: 30,
    CALLS_PER_MONTH: 10000,
  },
  ALPHA_VANTAGE: {
    CALLS_PER_MINUTE: 5,
    CALLS_PER_DAY: 500,
  },
  NEWSAPI: {
    CALLS_PER_DAY: 100,
  },
} as const;
