import { EVENT_CATEGORIES, IMPACT_LEVELS } from '../constants';

interface SentimentResult {
  score: number;
  category: string;
  impactLevel: string;
}

const NEGATIVE_KEYWORDS = [
  'crash', 'fall', 'drop', 'decline', 'plunge', 'collapse', 'crisis', 'ban',
  'regulation', 'crackdown', 'hack', 'breach', 'scam', 'fraud', 'lawsuit',
  'sell-off', 'bearish', 'tariff', 'war', 'uncertainty', 'fear', 'panic',
  'investigation', 'fine', 'penalty', 'restrict', 'prohibit'
];

const POSITIVE_KEYWORDS = [
  'surge', 'rally', 'gain', 'rise', 'soar', 'bullish', 'adoption', 'breakthrough',
  'partnership', 'invest', 'growth', 'profit', 'success', 'approve', 'launch',
  'innovation', 'record', 'high', 'opportunity', 'optimism', 'upgrade', 'milestone'
];

const CATEGORY_KEYWORDS = {
  [EVENT_CATEGORIES.TARIFF]: ['tariff', 'trade war', 'import tax', 'customs', 'trade policy'],
  [EVENT_CATEGORIES.REGULATION]: ['regulation', 'sec', 'regulatory', 'compliance', 'law', 'legal'],
  [EVENT_CATEGORIES.ADOPTION]: ['adoption', 'accept', 'integrate', 'partnership', 'announce'],
  [EVENT_CATEGORIES.SECURITY]: ['hack', 'breach', 'security', 'stolen', 'vulnerability', 'exploit'],
  [EVENT_CATEGORIES.FED_POLICY]: ['fed', 'federal reserve', 'interest rate', 'monetary policy', 'powell'],
  [EVENT_CATEGORIES.POLITICAL]: ['trump', 'president', 'government', 'congress', 'senate', 'election'],
  [EVENT_CATEGORIES.TECH]: ['upgrade', 'protocol', 'fork', 'update', 'technology', 'blockchain'],
  [EVENT_CATEGORIES.MARKET]: ['market', 'price', 'trading', 'volume', 'market cap', 'stock'],
};

const HIGH_IMPACT_KEYWORDS = [
  'trump', 'president', 'fed', 'federal reserve', 'ban', 'approve',
  'major', 'significant', 'massive', 'unprecedented', 'historic'
];

export function analyzeSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();

  let sentimentScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;

  POSITIVE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      positiveCount++;
      sentimentScore += 0.1;
    }
  });

  NEGATIVE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      negativeCount++;
      sentimentScore -= 0.1;
    }
  });

  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

  let category = EVENT_CATEGORIES.MARKET;
  let maxMatches = 0;

  Object.entries(CATEGORY_KEYWORDS).forEach(([cat, keywords]) => {
    let matches = 0;
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        matches++;
      }
    });

    if (matches > maxMatches) {
      maxMatches = matches;
      category = cat;
    }
  });

  let impactLevel = IMPACT_LEVELS.MEDIUM;
  HIGH_IMPACT_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      impactLevel = IMPACT_LEVELS.HIGH;
    }
  });

  if (positiveCount + negativeCount >= 5) {
    impactLevel = IMPACT_LEVELS.HIGH;
  } else if (positiveCount + negativeCount <= 1) {
    impactLevel = IMPACT_LEVELS.LOW;
  }

  return {
    score: sentimentScore,
    category,
    impactLevel,
  };
}

export function categorizeCryptoEvent(title: string, description: string): {
  category: string;
  keywords: string[];
} {
  const text = `${title} ${description}`.toLowerCase();
  const foundKeywords: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        foundKeywords.push(keyword);
        return { category, keywords: foundKeywords };
      }
    }
  }

  return { category: EVENT_CATEGORIES.MARKET, keywords: [] };
}

export async function analyzeBulkNews(
  newsItems: Array<{ title: string; description: string | null }>
): Promise<Array<{ sentiment: number; category: string; impactLevel: string }>> {
  return newsItems.map(item => {
    const text = `${item.title} ${item.description || ''}`;
    const result = analyzeSentiment(text);
    return {
      sentiment: result.score,
      category: result.category,
      impactLevel: result.impactLevel,
    };
  });
}
