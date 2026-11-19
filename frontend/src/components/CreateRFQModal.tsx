import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, Zap, Calendar, Sparkles } from 'lucide-react';
import { rfqService } from '../services/rfqService';
import { DateTimeDialog } from './DateTimeDialog';

interface CreateRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRFQModal: React.FC<CreateRFQModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateTimeLocal = (d: Date) => {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const now = new Date();
  const startDefault = formatDateTimeLocal(new Date(now.getTime() - 2 * 60 * 1000)); // Default started 2m ago -> ACTIVE!
  const closeDefault = formatDateTimeLocal(new Date(now.getTime() + 8 * 60 * 1000)); // Default 8m -> In trigger window!
  const forcedDefault = formatDateTimeLocal(new Date(now.getTime() + 60 * 60 * 1000)); // Default 1h
  const serviceDateDefault = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

  const [refId, setRefId] = useState(`RFQ-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState('');
  const [bidStart, setBidStart] = useState(startDefault);
  const [bidClose, setBidClose] = useState(closeDefault);
  const [forcedClose, setForcedClose] = useState(forcedDefault);
  const [serviceDate, setServiceDate] = useState(serviceDateDefault);
  const [triggerWindow, setTriggerWindow] = useState('10');
  const [extensionDuration, setExtensionDuration] = useState('5');
  const [triggerType, setTriggerType] = useState('BID_RECEIVED');

  // Fast Date Dialog State
  const [dialogField, setDialogField] = useState<'start' | 'close' | 'forced' | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1-Click Demo Preset Handler
  const applyDemoPreset = () => {
    const cur = new Date();
    setBidStart(formatDateTimeLocal(new Date(cur.getTime() - 2 * 60 * 1000))); // Started 2m ago -> Active!
    setBidClose(formatDateTimeLocal(new Date(cur.getTime() + 8 * 60 * 1000))); // Closes in 8m -> inside 10m window!
    setForcedClose(formatDateTimeLocal(new Date(cur.getTime() + 60 * 60 * 1000))); // Forced close in 1h
    setTriggerWindow('10');
    setExtensionDuration('5');
    setTriggerType('BID_RECEIVED');
    if (!name) setName('Air Cargo Express - Fast Demo Auction');
  };

  const applyStandardPreset = () => {
    const cur = new Date();
    setBidStart(formatDateTimeLocal(cur));
    setBidClose(formatDateTimeLocal(new Date(cur.getTime() + 24 * 60 * 60 * 1000)));
    setForcedClose(formatDateTimeLocal(new Date(cur.getTime() + 28 * 60 * 60 * 1000)));
    setTriggerWindow('30');
    setExtensionDuration('15');
    setTriggerType('L1_RANK_CHANGE');
    if (!name) setName('Ocean Freight Container Fleet - 24h Auction');
  };

  // Direct chip offsets
  const applyChipTime = (field: 'start' | 'close' | 'forced', minutesFromNow: number) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const val = formatDateTimeLocal(d);
    if (field === 'start') setBidStart(val);
    if (field === 'close') setBidClose(val);
    if (field === 'forced') setForcedClose(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const startMs = new Date(bidStart).getTime();
    const closeMs = new Date(bidClose).getTime();
    const forcedMs = new Date(forcedClose).getTime();

    if (closeMs <= startMs) {
      setError('Bid Close Date & Time must be strictly later than Bid Start Date & Time.');
      return;
    }
    if (forcedMs <= closeMs) {
      setError('Forced Bid Close Date & Time must be strictly later than Initial Bid Close Date & Time.');
      return;
    }

    setLoading(true);
    try {
      await rfqService.createRFQ({
        reference_id: refId,
        name: name,
        bid_start_at: new Date(bidStart).toISOString(),
        initial_bid_close_at: new Date(bidClose).toISOString(),
        forced_close_at: new Date(forcedClose).toISOString(),
        pickup_service_date: serviceDate,
        config: {
          trigger_window_minutes: parseInt(triggerWindow, 10) || 10,
          extension_duration_minutes: parseInt(extensionDuration, 10) || 5,
          trigger_type: triggerType,
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create RFQ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create New RFQ</h3>
                <p className="text-xs text-slate-400">Configure British Auction dynamic anti-sniping rules</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Presets Bar */}
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-indigo-200">Fast Demo Presets:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={applyDemoPreset}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shadow-sm transition-all"
                  title="Sets Start: Now, Close: +8m (inside window), Forced: +1h"
                >
                  <Zap className="w-3 h-3 text-amber-300" />
                  ⚡ 8m Live Demo Preset
                </button>
                <button
                  type="button"
                  onClick={applyStandardPreset}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  24h Standard Auction
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Reference ID *</label>
                <input
                  type="text"
                  required
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Pickup / Service Date *</label>
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">RFQ Name / Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trans-Pacific 40ft Container Freight"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Timing Section with Fast Date Dialogs */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Auction Schedule & Timing
                </span>
                <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Click "Fast Picker" on any field
                </span>
              </div>

              {/* Bid Start Time */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">Bid Start Time *</label>
                  <button
                    type="button"
                    onClick={() => setDialogField('start')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Zap className="w-3 h-3 text-amber-400" /> Fast Picker Dialog
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    required
                    value={bidStart}
                    onChange={(e) => setBidStart(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:border-indigo-500 outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyChipTime('start', 0)}
                      className="px-2 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      Now
                    </button>
                    <button
                      type="button"
                      onClick={() => applyChipTime('start', -5)}
                      className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50"
                      title="Starts 5m ago so RFQ is ACTIVE immediately"
                    >
                      Active Now
                    </button>
                    <button
                      type="button"
                      onClick={() => applyChipTime('start', 15)}
                      className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      +15m
                    </button>
                  </div>
                </div>
              </div>

              {/* Initial Bid Close */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">Initial Bid Close *</label>
                  <button
                    type="button"
                    onClick={() => setDialogField('close')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Zap className="w-3 h-3 text-amber-400" /> Fast Picker Dialog
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    required
                    value={bidClose}
                    onChange={(e) => setBidClose(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:border-indigo-500 outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyChipTime('close', 8)}
                      className="px-2 py-1 text-[10px] font-bold rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/50"
                      title="Closes in 8m (inside 10m trigger window)"
                    >
                      ⚡ +8m (Demo)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyChipTime('close', 15)}
                      className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => applyChipTime('close', 60)}
                      className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      +1h
                    </button>
                  </div>
                </div>
              </div>

              {/* Forced Close Limit */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">Forced Close Limit *</label>
                  <button
                    type="button"
                    onClick={() => setDialogField('forced')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Zap className="w-3 h-3 text-amber-400" /> Fast Picker Dialog
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    required
                    value={forcedClose}
                    onChange={(e) => setForcedClose(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:border-indigo-500 outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyChipTime('forced', 60)}
                      className="px-2 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      +1h Limit
                    </button>
                    <button
                      type="button"
                      onClick={() => applyChipTime('forced', 120)}
                      className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      +2h
                    </button>
                    <button
                      type="button"
                      onClick={() => applyChipTime('forced', 1440)}
                      className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      +24h
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Rule: Forced Close must be strictly later than Initial Bid Close. Auction will never extend past Forced Close.
              </p>
            </div>

            {/* British Auction Config */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30 space-y-3">
              <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                British Auction Anti-Sniping Parameters
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Trigger Window (X Minutes) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={triggerWindow}
                    onChange={(e) => setTriggerWindow(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Extension Duration (Y Minutes) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={extensionDuration}
                    onChange={(e) => setExtensionDuration(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-2">Extension Trigger Condition *</label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'BID_RECEIVED',
                      title: '1. BID_RECEIVED',
                      desc: 'Extends whenever any qualifying new downward bid is submitted in the trigger window.',
                    },
                    {
                      id: 'ANY_SUPPLIER_RANK_CHANGE',
                      title: '2. ANY_SUPPLIER_RANK_CHANGE',
                      desc: 'Extends only when any supplier ranking position changes in the trigger window.',
                    },
                    {
                      id: 'L1_RANK_CHANGE',
                      title: '3. L1_RANK_CHANGE',
                      desc: 'Extends only when the lowest-price supplier identity (L1) changes in the trigger window.',
                    },
                  ].map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        triggerType === t.id
                          ? 'bg-indigo-600/10 border-indigo-500/60'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="triggerType"
                        value={t.id}
                        checked={triggerType === t.id}
                        onChange={(e) => setTriggerType(e.target.value)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">{t.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              >
                {loading ? 'Creating RFQ...' : 'Create RFQ'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Date Time Dialog Modal */}
      {dialogField && (
        <DateTimeDialog
          isOpen={true}
          onClose={() => setDialogField(null)}
          title={
            dialogField === 'start'
              ? 'Select Bid Start Time'
              : dialogField === 'close'
              ? 'Select Initial Bid Close Time'
              : 'Select Forced Close Limit'
          }
          currentValue={
            dialogField === 'start'
              ? bidStart
              : dialogField === 'close'
              ? bidClose
              : forcedClose
          }
          fieldRole={dialogField}
          onSelect={(val) => {
            if (dialogField === 'start') setBidStart(val);
            if (dialogField === 'close') setBidClose(val);
            if (dialogField === 'forced') setForcedClose(val);
          }}
        />
      )}
    </>
  );
};
