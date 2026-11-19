import React from 'react';
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useCountdown, parseUTC } from '../hooks/useCountdown';

interface CountdownTimerProps {
  closeTime?: string;
  forcedCloseTime?: string;
  triggerWindowMinutes?: number;
  extensionMinutes?: number;
  status: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  closeTime,
  forcedCloseTime,
  triggerWindowMinutes = 10,
  extensionMinutes = 5,
  status,
}) => {
  const { formattedTime, isInTriggerWindow, isExpired, forcedTimeFormatted, isForcedExpired } = useCountdown(
    closeTime,
    forcedCloseTime,
    triggerWindowMinutes
  );

  const isActive = status === 'ACTIVE';

  if (!isActive) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Auction Clock</div>
            <div className="text-sm font-semibold text-slate-300">
              {status === 'CLOSED' || status === 'FORCE_CLOSED' ? 'Bidding Concluded' : 'Auction Not Active'}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {closeTime ? `Ended: ${new Date(parseUTC(closeTime)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isInTriggerWindow
          ? 'bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-900 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
          : 'bg-slate-900/70 border-slate-800'
      }`}
    >
      {/* Background glow if in trigger window */}
      {isInTriggerWindow && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-xl border ${
              isInTriggerWindow
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Current Bid Close</span>
              {isInTriggerWindow && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" /> In Trigger Window ({triggerWindowMinutes}m)
                </span>
              )}
            </div>
            <div className="text-3xl font-extrabold tracking-tight font-mono text-white mt-0.5">
              {isExpired ? '00:00:00' : formattedTime}
            </div>
          </div>
        </div>

        {/* Forced close limit indicator */}
        <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Hard Forced Close Cap</div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {forcedCloseTime
                ? new Date(parseUTC(forcedCloseTime)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
              <span className="text-slate-500 ml-1.5 font-sans">({forcedTimeFormatted} left)</span>
            </div>
          </div>
        </div>
      </div>

      {isInTriggerWindow && (
        <div className="px-5 py-2.5 bg-amber-500/10 border-t border-amber-500/20 text-xs text-amber-200 flex items-center justify-between">
          <span>
            ⚡ <strong>Dynamic Extension Active:</strong> A qualifying bid submitted now will extend closing time by{' '}
            <strong>{extensionMinutes} minutes</strong> (capped at forced close).
          </span>
        </div>
      )}
    </div>
  );
};
