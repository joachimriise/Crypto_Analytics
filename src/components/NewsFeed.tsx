import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

interface NewsEvent {
  id: string;
  title: string;
  description: string | null;
  source: string;
  url: string | null;
  category: string;
  sentiment_score: number | null;
  impact_level: string | null;
  published_at: string;
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    try {
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      setNews(data || []);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  }

  function getSentimentIcon(score: number | null) {
    if (!score) return null;
    if (score > 0.1) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (score < -0.1) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return null;
  }

  function getImpactColor(level: string | null) {
    if (level === 'high') return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (level === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Latest News & Events</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map(item => (
            <div
              key={item.id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white mb-1 line-clamp-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-slate-400 line-clamp-2">{item.description}</p>
                  )}
                </div>
                {getSentimentIcon(item.sentiment_score)}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">{item.source}</span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-500">
                    {new Date(item.published_at).toLocaleDateString()}
                  </span>
                  {item.impact_level && (
                    <>
                      <span className="text-xs text-slate-600">•</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${getImpactColor(
                          item.impact_level
                        )}`}
                      >
                        {item.impact_level} impact
                      </span>
                    </>
                  )}
                </div>

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
