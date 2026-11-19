import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface RankBadgeProps {
  rankLabel: string; // L1, L2, L3, L4...
  size?: 'sm' | 'md' | 'lg';
}

export const RankBadge: React.FC<RankBadgeProps> = ({ rankLabel, size = 'md' }) => {
  const isL1 = rankLabel === 'L1';
  const isL2 = rankLabel === 'L2';
  const isL3 = rankLabel === 'L3';

  const getStyle = () => {
    if (isL1) {
      return {
        container: 'bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
        icon: <Trophy className="w-3.5 h-3.5 text-amber-400" />,
        text: 'L1 (Lowest Bidder)',
      };
    }
    if (isL2) {
      return {
        container: 'bg-slate-700/30 border-slate-400/30 text-slate-200',
        icon: <Medal className="w-3.5 h-3.5 text-slate-300" />,
        text: 'L2 Bidder',
      };
    }
    if (isL3) {
      return {
        container: 'bg-amber-900/20 border-amber-700/30 text-amber-300',
        icon: <Award className="w-3.5 h-3.5 text-amber-500" />,
        text: 'L3 Bidder',
      };
    }
    return {
      container: 'bg-slate-800/40 border-slate-700/40 text-slate-400',
      icon: null,
      text: rankLabel,
    };
  };

  const style = getStyle();
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${style.container} ${sizeClasses}`}>
      {style.icon}
      <span>{style.text}</span>
    </span>
  );
};
