import React, { useState } from 'react';
import { X, Trophy, CheckCircle2 } from 'lucide-react';
import { SupplierRankingItem } from '../types/auction';
import { rfqService } from '../services/rfqService';
import { RankBadge } from './RankBadge';

interface SelectWinnerModalProps {
  rfqId: string;
  rfqName: string;
  rankings: SupplierRankingItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SelectWinnerModal: React.FC<SelectWinnerModalProps> = ({
  rfqId,
  rfqName,
  rankings,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => {
    return rankings && rankings.length > 0 ? rankings[0].supplier_id : '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmAward = async () => {
    if (!selectedSupplierId) {
      setError('Please select a supplier to award.');
      return;
    }

    setLoading(true);
    try {
      await rfqService.selectWinner(rfqId, selectedSupplierId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to select winner.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Award RFQ Contract</h3>
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

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Select the winning supplier below. By default, the system recommends the lowest bidder (L1).
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {rankings.map((r) => (
              <label
                key={r.supplier_id}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedSupplierId === r.supplier_id
                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="winner_supplier"
                    value={r.supplier_id}
                    checked={selectedSupplierId === r.supplier_id}
                    onChange={() => setSelectedSupplierId(r.supplier_id)}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{r.supplier_name}</span>
                      <RankBadge rankLabel={r.rank_label} size="sm" />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Submitted at: {new Date(r.submitted_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Final Price</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    INR {r.current_bid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </label>
            ))}
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
              type="button"
              onClick={handleConfirmAward}
              disabled={loading || !selectedSupplierId}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Award Supplier
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
