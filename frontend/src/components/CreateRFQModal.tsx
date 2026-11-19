import React, { useState } from 'react';
import { X, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { rfqService } from '../services/rfqService';

interface CreateRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRFQModal: React.FC<CreateRFQModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Generate default timestamps
  const now = new Date();
  const formatDateTimeLocal = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const startDefault = formatDateTimeLocal(new Date(now.getTime() + 10 * 60 * 1000));
  const closeDefault = formatDateTimeLocal(new Date(now.getTime() + 70 * 60 * 1000));
  const forcedDefault = formatDateTimeLocal(new Date(now.getTime() + 150 * 60 * 1000));
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
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

          {/* Timing Section */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Auction Schedule</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Bid Start Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={bidStart}
                  onChange={(e) => setBidStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Initial Bid Close *</label>
                <input
                  type="datetime-local"
                  required
                  value={bidClose}
                  onChange={(e) => setBidClose(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Forced Close Limit *</label>
                <input
                  type="datetime-local"
                  required
                  value={forcedClose}
                  onChange={(e) => setForcedClose(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Rule: Forced Close must be later than Initial Bid Close. Auction will never extend past Forced Close.
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
                    title: '1. Bid Received in Last X Minutes',
                    desc: 'Extends when any supplier submits a valid downward bid during the trigger window.',
                  },
                  {
                    id: 'ANY_SUPPLIER_RANK_CHANGE',
                    title: '2. Any Supplier Rank Change in Last X Minutes',
                    desc: 'Extends when any supplier ranking position changes during the trigger window.',
                  },
                  {
                    id: 'L1_RANK_CHANGE',
                    title: '3. Lowest Bidder (L1) Rank Change in Last X Minutes',
                    desc: 'Extends ONLY when the identity of the lowest-priced supplier changes.',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`block p-2.5 rounded-xl border cursor-pointer transition-all ${
                      triggerType === opt.id
                        ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="trigger_type"
                        value={opt.id}
                        checked={triggerType === opt.id}
                        onChange={() => setTriggerType(opt.id)}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span className="text-xs font-bold text-slate-200">{opt.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 pl-5 mt-0.5">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Create & Save RFQ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
