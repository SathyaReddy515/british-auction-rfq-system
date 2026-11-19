import React from 'react';
import { ActivityLog } from '../types/auction';
import { 
  ArrowDownCircle, 
  Clock, 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Send,
  Zap
} from 'lucide-react';

interface ActivityFeedProps {
  logs: ActivityLog[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ logs }) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'AUCTION_EXTENDED':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'BID_SUBMITTED':
        return <ArrowDownCircle className="w-4 h-4 text-emerald-400" />;
      case 'RANK_CHANGED':
        return <Trophy className="w-4 h-4 text-indigo-400" />;
      case 'AUCTION_CLOSED':
        return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
      case 'FORCE_CLOSED':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'WINNER_SELECTED':
        return <Trophy className="w-4 h-4 text-amber-300" />;
      case 'QUOTE_SUBMITTED':
        return <FileText className="w-4 h-4 text-blue-400" />;
      default:
        return <Send className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBadgeStyle = (eventType: string) => {
    switch (eventType) {
      case 'AUCTION_EXTENDED':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      case 'BID_SUBMITTED':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
      case 'RANK_CHANGED':
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300';
      case 'FORCE_CLOSED':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
      case 'WINNER_SELECTED':
        return 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold';
      default:
        return 'bg-slate-800/40 border-slate-700/40 text-slate-400';
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-sm">
        No auction activity recorded yet. Bids and extensions will stream here in real time.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {logs.map((log) => {
        const timeStr = new Date(log.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        return (
          <div key={log.id} className="relative group">
            {/* Timeline node */}
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-950 border-2 border-slate-700 group-hover:border-emerald-500 transition-colors flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-400" />
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 transition-all">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border font-medium ${getBadgeStyle(log.event_type)}`}>
                    {getEventIcon(log.event_type)}
                    <span>{log.event_type.replace(/_/g, ' ')}</span>
                  </span>
                  <span className="text-xs font-medium text-slate-300">{log.actor_name || 'System'}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">{timeStr}</div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed">{log.description}</div>

              {log.event_data && Object.keys(log.event_data).length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                  {Object.entries(log.event_data).map(([key, val]) => {
                    if (typeof val === 'object' || val === null) return null;
                    return (
                      <span key={key} className="bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                        {key}: <span className="text-slate-200">{String(val)}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
