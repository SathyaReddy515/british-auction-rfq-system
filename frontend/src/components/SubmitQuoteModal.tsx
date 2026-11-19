import React, { useState } from 'react';
import { X, FileText, CheckCircle2 } from 'lucide-react';
import { rfqService } from '../services/rfqService';

interface SubmitQuoteModalProps {
  rfqId: string;
  rfqName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubmitQuoteModal: React.FC<SubmitQuoteModalProps> = ({
  rfqId,
  rfqName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [carrierName, setCarrierName] = useState('Maersk Line');
  const [freightCharges, setFreightCharges] = useState('42000');
  const [originCharges, setOriginCharges] = useState('2500');
  const [destinationCharges, setDestinationCharges] = useState('2500');
  const [transitTime, setTransitTime] = useState('14-16 Business Days');
  const [validityText, setValidityText] = useState('30 Days from Bid Acceptance');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCalculated =
    (parseFloat(freightCharges) || 0) +
    (parseFloat(originCharges) || 0) +
    (parseFloat(destinationCharges) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!carrierName || !transitTime || !validityText) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await rfqService.submitQuote(rfqId, {
        carrier_name: carrierName,
        freight_charges: parseFloat(freightCharges) || 0,
        origin_charges: parseFloat(originCharges) || 0,
        destination_charges: parseFloat(destinationCharges) || 0,
        transit_time: transitTime,
        validity_text: validityText,
        currency_code: currencyCode,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit quote.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Submit Initial Quotation</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{rfqName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Carrier Name *</label>
            <input
              type="text"
              required
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="e.g. Maersk, MSC, DHL, BlueDart"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Freight (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={freightCharges}
                onChange={(e) => setFreightCharges(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Origin (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={originCharges}
                onChange={(e) => setOriginCharges(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Destination (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={destinationCharges}
                onChange={(e) => setDestinationCharges(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Initial total highlight */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Initial Total Price (Your Baseline Bid):</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              INR {totalCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Transit Time *</label>
              <input
                type="text"
                required
                value={transitTime}
                onChange={(e) => setTransitTime(e.target.value)}
                placeholder="e.g. 14 Days"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Quote Validity *</label>
              <input
                type="text"
                required
                value={validityText}
                onChange={(e) => setValidityText(e.target.value)}
                placeholder="e.g. 30 Days"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
              />
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Submit Quotation & Join Auction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
