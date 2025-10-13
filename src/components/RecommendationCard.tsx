import { ArrowUpCircle, ArrowDownCircle, Target, Shield } from 'lucide-react';

interface Recommendation {
  id: string;
  crypto_symbol: string;
  action: string;
  confidence_percent: number;
  reasoning: string;
  target_price: number | null;
  stop_loss: number | null;
  generated_at: string;
}

interface Props {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: Props) {
  const isBuy = recommendation.action === 'BUY';
  const bgColor = isBuy ? 'from-emerald-900/40 to-emerald-800/20' : 'from-red-900/40 to-red-800/20';
  const borderColor = isBuy ? 'border-emerald-500/50' : 'border-red-500/50';
  const textColor = isBuy ? 'text-emerald-400' : 'text-red-400';
  const Icon = isBuy ? ArrowUpCircle : ArrowDownCircle;

  const confidenceColor =
    recommendation.confidence_percent >= 80
      ? 'text-emerald-400'
      : recommendation.confidence_percent >= 60
      ? 'text-amber-400'
      : 'text-slate-400';

  return (
    <div
      className={`bg-gradient-to-br ${bgColor} border ${borderColor} rounded-xl p-6 hover:scale-[1.02] transition-transform duration-200`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-8 h-8 ${textColor}`} />
          <div>
            <h3 className="text-2xl font-bold text-white">{recommendation.crypto_symbol}</h3>
            <p className={`text-sm font-bold ${textColor} uppercase`}>{recommendation.action}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Confidence</p>
          <p className={`text-2xl font-bold ${confidenceColor}`}>
            {recommendation.confidence_percent}%
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-slate-300 leading-relaxed">{recommendation.reasoning}</p>
      </div>

      {(recommendation.target_price || recommendation.stop_loss) && (
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700">
          {recommendation.target_price && (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Target</p>
                <p className="text-sm font-bold text-white">
                  ${recommendation.target_price.toLocaleString()}
                </p>
              </div>
            </div>
          )}
          {recommendation.stop_loss && (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" />
              <div>
                <p className="text-xs text-slate-400">Stop Loss</p>
                <p className="text-sm font-bold text-white">
                  ${recommendation.stop_loss.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
