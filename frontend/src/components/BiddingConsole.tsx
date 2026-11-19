import React, { useState } from 'react';
import { ArrowDown, DollarSign, Send, AlertCircle, ShieldCheck } from 'lucide-react';
import { RankBadge } from './RankBadge';

interface BiddingConsoleProps {
  rfqId: string;
  currencyCode?: string;
  currentLowestBid?: number;
  userPreviousBid?: number;
  userRankLabel?: string;
  isEligibleToBid: boolean; // has submitted baseline quotation
  isAuctionActive: boolean;
  onSubmitBid: (amount: number) => Promise<void>;
  onOpenQuoteModal: () => void;
}

export const BiddingConsole: React.FC<BiddingConsoleProps> = ({
  currencyCode = 'INR',
  currentLowestBid,
  userPreviousBid,
  userRankLabel,
  isEligibleToBid,
  isAuctionActive,
  onSubmitBid,
  onOpenQuoteModal,
}) => {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const prevPrice = userPreviousBid || 0;
  const numBid = parseFloat(bidAmount);

  // Quick decrease handler
  const handleQuickDecrease = (delta: number) => {
    setErrorMsg(null);
    const target = userPreviousBid ? userPreviousBid - delta : (currentLowestBid ? currentLowestBid - delta : 10000 - delta);
    if (target > 0) {
      setBidAmount(target.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!bidAmount || isNaN(numBid) || numBid <= 0) {
      setErrorMsg('Please enter a valid positive bid amount.');
      return;
    }

    if (userPreviousBid && numBid >= userPreviousBid) {
      setErrorMsg(`Your bid must be strictly lower than your previous price of ${currencyCode} ${userPreviousBid.toLocaleString()}.`);
      return;
    }

    setLoading(true);
    try {
      await onSubmitBid(numBid);
      setBidAmount('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit bid. Please check rules.');
    } finally {
      setLoading(false);
    }
  };

  if (!isEligibleToBid) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-100">Baseline Quotation Required</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Submit your carrier charges breakdown to initialize your baseline price and unlock live downward bidding.
        </p>
        <button
          onClick={onOpenQuoteModal}
          disabled={!isAuctionActive}
          className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
        >
          Submit Initial Quote Breakdown
        </button>
      </div>
    );
  }

  if (!isAuctionActive) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm">
        Bidding is closed for this auction.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live Bidding Console</div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">Submit Competitive Downward Bid</div>
        </div>
        {userRankLabel && <RankBadge rankLabel={userRankLabel} size="md" />}
      </div>

      {/* Pricing Context Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Your Current Price</div>
          <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">
            {currencyCode} {prevPrice.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-3">
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Market L1 Lowest Price</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {currentLowestBid ? `${currencyCode} ${currentLowestBid.toLocaleString()}` : 'None yet'}
          </div>
        </div>
      </div>

      {/* Quick decrement buttons */}
      <div className="mb-4">
        <label className="text-xs font-medium text-slate-400 mb-2 block">Quick Reductions below your price:</label>
        <div className="grid grid-cols-4 gap-2">
          {[500, 1000, 2500, 5000].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => handleQuickDecrease(delta)}
              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700/60 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowDown className="w-3 h-3 text-emerald-400" /> -{delta}
            </button>
          ))}
        </div>
      </div>

      {/* Bid submission form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-mono text-sm">
              {currencyCode}
            </div>
            <input
              type="number"
              step="0.01"
              value={bidAmount}
              onChange={(e) => {
                setBidAmount(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={`Enter price lower than ${prevPrice.toLocaleString()}`}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white font-mono text-sm outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          {numBid > 0 && prevPrice > 0 && numBid >= prevPrice && (
            <div className="text-xs text-rose-400 flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Bid must be strictly lower than your current price ({currencyCode} {prevPrice.toLocaleString()}).
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !bidAmount || (prevPrice > 0 && numBid >= prevPrice)}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" /> Submit Competitive Bid
            </>
          )}
        </button>
      </form>
    </div>
  );
};
