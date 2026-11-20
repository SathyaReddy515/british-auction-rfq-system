import React, { useState, useEffect } from 'react';
import { X, Trophy, CheckCircle2, ShieldCheck, Calendar, DollarSign, Award } from 'lucide-react';
import { SupplierRankingItem, AuctionResult } from '../types/auction';
import { rfqService } from '../services/rfqService';
import { RankBadge } from './RankBadge';
import { parseUTC } from '../hooks/useCountdown';

interface SelectWinnerModalProps {
  rfqId: string;
  rfqName: string;
  rankings: SupplierRankingItem[];
  result?: AuctionResult | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (winnerName?: string) => void;
}

export const SelectWinnerModal: React.FC<SelectWinnerModalProps> = ({
  rfqId,
  rfqName,
  rankings,
  result,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isAlreadyAwarded = result?.selection_status === 'SELECTED';

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => {
    return rankings && rankings.length > 0 ? rankings[0].supplier_id : '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rankings && rankings.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(rankings[0].supplier_id);
    }
  }, [rankings, selectedSupplierId]);

  if (!isOpen) return null;

  const handleConfirmAward = async () => {
    if (!selectedSupplierId) {
      setError('Please select a supplier to award.');
      return;
    }

    setLoading(true);
    try {
      const selectedItem = rankings.find((r) => r.supplier_id === selectedSupplierId);
      const res = await rfqService.selectWinner(rfqId, selectedSupplierId);
      const winnerName = res.winning_supplier_name || selectedItem?.supplier_name || 'Selected Supplier';
      onSuccess(winnerName);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to select winner.');
    } finally {
      setLoading(false);
    }
  };

  // Case 1: Contract has already been awarded -> View Award Details Mode
  if (isAlreadyAwarded && result) {
    const closedDateStr = result.closed_at
      ? new Date(parseUTC(result.closed_at)).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'N/A';

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-amber-950/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Contract Officially Awarded
                </h3>
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
            {/* Award Certificate Card */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/30 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Procurement Award Certificate
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  STATUS: AWARDED
                </span>
              </div>

              <div>
                <div className="text-xs text-slate-400">Awarded Winning Supplier</div>
                <div className="text-lg font-extrabold text-white mt-0.5">
                  {result.winning_supplier_name || 'Winning Supplier'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="text-[11px] text-slate-400">Final Contract Amount</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    {result.final_bid_amount
                      ? `INR ${result.final_bid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : 'N/A'}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Conclusion Timestamp</div>
                  <div className="text-xs font-mono text-slate-300 mt-1">{closedDateStr}</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              The buyer has finalized and approved this contract. Supplier identity and final bid price have been snapshot into the immutable audit trail.
            </p>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close Award Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Contract not yet awarded -> Winner Selection Form Mode
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
                      Submitted at: {new Date(parseUTC(r.submitted_at)).toLocaleTimeString()}
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
