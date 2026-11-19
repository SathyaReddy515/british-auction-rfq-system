import React, { useState } from 'react';
import { Calendar, Clock, Zap, Plus, Minus, Check, X } from 'lucide-react';

interface DateTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentValue: string; // "YYYY-MM-DDTHH:mm" format
  onSelect: (value: string) => void;
  minDate?: string;
  fieldRole?: 'start' | 'close' | 'forced' | 'service';
}

export const DateTimeDialog: React.FC<DateTimeDialogProps> = ({
  isOpen,
  onClose,
  title,
  currentValue,
  onSelect,
  minDate,
  fieldRole = 'close',
}) => {
  const [selectedDateTime, setSelectedDateTime] = useState<string>(currentValue);

  if (!isOpen) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const formatToLocalISO = (d: Date) => {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getBaseDate = () => {
    try {
      const parsed = new Date(selectedDateTime);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {}
    return new Date();
  };

  // Quick preset helper
  const applyOffsetMinutes = (minutesFromNow: number) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const formatted = formatToLocalISO(d);
    setSelectedDateTime(formatted);
  };

  // Adjust relative to current selection
  const adjustMinutes = (deltaMinutes: number) => {
    const base = getBaseDate();
    const d = new Date(base.getTime() + deltaMinutes * 60 * 1000);
    setSelectedDateTime(formatToLocalISO(d));
  };

  const handleApply = () => {
    onSelect(selectedDateTime);
    onClose();
  };

  // Context-specific presets based on which date field is being changed
  const getPresets = () => {
    if (fieldRole === 'start') {
      return [
        { label: 'Now (Active Immediately)', minutes: 0, tag: 'Popular' },
        { label: '5 Mins Ago (Active)', minutes: -5, tag: 'Instant' },
        { label: 'In 15 Mins', minutes: 15 },
        { label: 'In 1 Hour', minutes: 60 },
        { label: 'Tomorrow 09:00', minutes: 14 * 60 },
      ];
    }
    if (fieldRole === 'close') {
      return [
        { label: '+5 Mins', minutes: 5, tag: 'Quick' },
        { label: '+8 Mins (Fast Demo - In Trigger Window)', minutes: 8, tag: 'Recommended' },
        { label: '+15 Mins', minutes: 15 },
        { label: '+30 Mins', minutes: 30 },
        { label: '+1 Hour', minutes: 60 },
        { label: '+24 Hours (Standard)', minutes: 1440 },
      ];
    }
    if (fieldRole === 'forced') {
      return [
        { label: '+30 Mins Limit', minutes: 30 },
        { label: '+1 Hour Limit', minutes: 60, tag: 'Recommended' },
        { label: '+2 Hours Limit', minutes: 120 },
        { label: '+28 Hours Limit', minutes: 1680 },
        { label: '+48 Hours Limit', minutes: 2880 },
      ];
    }
    // Generic
    return [
      { label: 'In 10 Mins', minutes: 10 },
      { label: 'In 30 Mins', minutes: 30 },
      { label: 'In 1 Hour', minutes: 60 },
      { label: 'Tomorrow', minutes: 1440 },
    ];
  };

  const presets = getPresets();

  const previewDate = getBaseDate();
  const diffMinutes = Math.round((previewDate.getTime() - Date.now()) / (60 * 1000));
  const timeRelativeLabel =
    diffMinutes === 0
      ? 'Right now'
      : diffMinutes > 0
      ? `In ${diffMinutes >= 60 ? `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m` : `${diffMinutes} mins`}`
      : `${Math.abs(diffMinutes)} mins ago`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">Fast date & time entry picker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Live Preview Display */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider mb-0.5">
                Target Selected Date & Time
              </div>
              <div className="text-sm font-bold font-mono text-white">
                {previewDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                -{' '}
                {previewDate.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {timeRelativeLabel}
              </span>
            </div>
          </div>

          {/* Quick 1-Click Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Fast Entry Presets</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyOffsetMinutes(p.minutes)}
                  className="px-3 py-2 text-left rounded-xl bg-slate-800 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-slate-700/80 transition-all group flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    {p.label}
                  </span>
                  {p.tag && (
                    <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {p.tag}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Fine Tuning Stepper Buttons */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Fine-Tune Adjustment
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => adjustMinutes(-15)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-1 border border-slate-700"
              >
                <Minus className="w-3 h-3" /> 15m
              </button>
              <button
                type="button"
                onClick={() => adjustMinutes(-5)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-1 border border-slate-700"
              >
                <Minus className="w-3 h-3" /> 5m
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => adjustMinutes(5)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-1 border border-slate-700"
              >
                <Plus className="w-3 h-3" /> 5m
              </button>
              <button
                type="button"
                onClick={() => adjustMinutes(10)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-1 border border-slate-700"
              >
                <Plus className="w-3 h-3" /> 10m
              </button>
              <button
                type="button"
                onClick={() => adjustMinutes(30)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-1 border border-slate-700"
              >
                <Plus className="w-3 h-3" /> 30m
              </button>
              <button
                type="button"
                onClick={() => adjustMinutes(60)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-1 border border-slate-700"
              >
                <Plus className="w-3 h-3" /> 1h
              </button>
            </div>
          </div>

          {/* Standard Input Fallback */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Exact Date & Time Input
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={selectedDateTime}
                min={minDate}
                onChange={(e) => setSelectedDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Date & Time
          </button>
        </div>
      </div>
    </div>
  );
};
