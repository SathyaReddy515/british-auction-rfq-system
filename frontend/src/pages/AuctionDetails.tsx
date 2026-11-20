import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Gavel, 
  History, 
  Settings2, 
  Trophy, 
  CheckCircle, 
  Send, 
  Zap,
  Radio,
  Share2,
  Calendar
} from 'lucide-react';
import { RFQ, Quote, Bid, SupplierRankingItem, ActivityLog, AuctionResult } from '../types/auction';
import { rfqService } from '../services/rfqService';
import { useAuth } from '../context/AuthContext';
import { useAuctionWebSocket } from '../hooks/useAuctionWebSocket';
import { StatusBadge } from '../components/StatusBadge';
import { RankBadge } from '../components/RankBadge';
import { CountdownTimer } from '../components/CountdownTimer';
import { parseUTC } from '../hooks/useCountdown';
import { BiddingConsole } from '../components/BiddingConsole';
import { SubmitQuoteModal } from '../components/SubmitQuoteModal';
import { SelectWinnerModal } from '../components/SelectWinnerModal';
import { ActivityFeed } from '../components/ActivityFeed';
import { DateTimeDialog } from '../components/DateTimeDialog';

export const AuctionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [rankings, setRankings] = useState<SupplierRankingItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [result, setResult] = useState<AuctionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'bidding' | 'quotes' | 'config' | 'logs'>('bidding');

  // Modals
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);

  // Extension notification banner
  const [extensionNotice, setExtensionNotice] = useState<string | null>(null);

  const fetchAuctionData = useCallback(async () => {
    if (!id) return;
    try {
      const [rfqData, quotesData, bidsData, rankingsData, logsData] = await Promise.all([
        rfqService.getRFQ(id),
        rfqService.getQuotes(id).catch(() => []),
        rfqService.getBids(id).catch(() => []),
        rfqService.getRankings(id).catch(() => ({ rankings: [] })),
        rfqService.getActivityLogs(id).catch(() => []),
      ]);

      setRfq(rfqData);
      setQuotes(quotesData);
      setBids(bidsData);
      setRankings(rankingsData.rankings);
      setActivityLogs(logsData);

      if (rfqData.status === 'CLOSED' || rfqData.status === 'FORCE_CLOSED') {
        rfqService.getResults(id).then(setResult).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load auction details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAuctionData();
  }, [fetchAuctionData]);

  // Real-time WebSocket handler
  const handleWebSocketEvent = useCallback((event: any) => {
    if (event.type === 'NEW_BID') {
      // Update lowest bid and rankings in real-time
      // Enrich WS rankings with is_current_user since broadcast doesn't know viewer
      const enrichedRankings = (event.rankings || []).map((r: any) => ({
        ...r,
        is_current_user: r.supplier_id === user?.id
      }));
      setRankings(enrichedRankings);
      if (event.current_lowest_bid) {
        setRfq((prev) => prev ? { ...prev, current_lowest_bid: event.current_lowest_bid } : null);
      }
      if (event.is_extended && event.new_close_time) {
        setRfq((prev) => prev ? { ...prev, current_bid_close_at: event.new_close_time } : null);
        setExtensionNotice(`⚡ Auction Extended by ${event.extension_reason || 'trigger condition'}! New close: ${new Date(event.new_close_time).toLocaleTimeString()}`);
        setTimeout(() => setExtensionNotice(null), 10000);
      }
      // Re-fetch bids and activity logs
      if (id) {
        rfqService.getBids(id).then(setBids).catch(() => {});
        rfqService.getActivityLogs(id).then(setActivityLogs).catch(() => {});
      }
    } else if (event.type === 'AUCTION_STATE') {
      if (event.rankings) {
        const enrichedRankings = event.rankings.map((r: any) => ({
          ...r,
          is_current_user: r.supplier_id === user?.id
        }));
        setRankings(enrichedRankings);
      }
      if (event.current_bid_close_at) {
        setRfq((prev) => prev ? { ...prev, current_bid_close_at: event.current_bid_close_at, status: event.status } : null);
      }
    } else if (event.type === 'AUCTION_CLOSED' || event.type === 'AUCTION_FORCE_CLOSED') {
      setRfq((prev) => prev ? { ...prev, status: event.status } : null);
      setExtensionNotice(`🏁 Auction Concluded: Status changed to ${event.status}.`);
      setTimeout(() => setExtensionNotice(null), 10000);
      if (id) {
        rfqService.getResults(id).then(setResult).catch(() => {});
        rfqService.getActivityLogs(id).then(setActivityLogs).catch(() => {});
      }
    } else if (event.type === 'WINNER_SELECTED' || event.type === 'AWARD_RESULT') {
      const winnerName = (event as any).winning_supplier_name || (event as any).winner_supplier_name || 'Winning Supplier';
      const winnerId = (event as any).winning_supplier_id || (event as any).winner_supplier_id;
      const isCurrentUserWinner = user?.id === winnerId;

      if (user?.role === 'SUPPLIER') {
        if (isCurrentUserWinner) {
          setExtensionNotice(`🎉 Congratulations! You WON this auction! The contract has been officially awarded to you.`);
        } else {
          setExtensionNotice(`❌ Auction Concluded: The contract was awarded to ${winnerName}.`);
        }
      } else {
        setExtensionNotice(`🏆 Contract Officially Awarded to ${winnerName}!`);
      }
      setTimeout(() => setExtensionNotice(null), 15000);
      if (id) {
        rfqService.getResults(id).then(setResult).catch(() => {});
        rfqService.getActivityLogs(id).then(setActivityLogs).catch(() => {});
      }
    }
  }, [id]);

  const { isConnected } = useAuctionWebSocket({
    rfqId: id || '',
    token,
    onEvent: handleWebSocketEvent,
  });

  const handlePublishRFQ = async () => {
    if (!id) return;
    try {
      const updated = await rfqService.publishRFQ(id);
      setRfq(updated);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to publish RFQ.');
    }
  };

  const handleScheduleUpdate = async (newCloseDate: string) => {
    if (!id) return;
    try {
      const updated = await rfqService.updateSchedule(id, {
        current_bid_close_at: new Date(newCloseDate).toISOString(),
      });
      setRfq(updated);
      setExtensionNotice(`📅 Closing time updated to ${new Date(newCloseDate).toLocaleTimeString()}`);
      setTimeout(() => setExtensionNotice(null), 8000);
      fetchAuctionData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to update auction schedule.');
    }
  };

  const handleCheckClosure = async () => {
    if (!id) return;
    try {
      const res = await rfqService.checkClosure(id);
      if (res.closed) {
        setExtensionNotice('🏁 Auction Concluded: Status transitioned to CLOSED.');
        setTimeout(() => setExtensionNotice(null), 10000);
        fetchAuctionData();
      } else {
        alert(res.description);
      }
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error running closure check.');
    }
  };

  const handleAutoClose = useCallback(async () => {
    if (!id || rfq?.status !== 'ACTIVE') return;
    try {
      const res = await rfqService.checkClosure(id);
      if (res.closed) {
        setExtensionNotice('🏁 Countdown reached zero! Auction automatically concluded.');
        setTimeout(() => setExtensionNotice(null), 10000);
        fetchAuctionData();
      }
    } catch (err) {
      console.error('Auto-closure check failed:', err);
    }
  }, [id, rfq?.status, fetchAuctionData]);

  if (loading || !rfq) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
        Loading auction workspace...
      </div>
    );
  }

  const isBuyer = user?.role === 'BUYER';
  const isAuctionActive = rfq.status === 'ACTIVE';
  const isClosed = rfq.status === 'CLOSED' || rfq.status === 'FORCE_CLOSED';

  // Find user's submitted quote (if supplier)
  const userQuote = quotes.find((q) => q.supplier_id === user?.id);

  // Find user's latest bid
  const userLatestBid = bids
    .filter((b) => b.supplier_id === user?.id)
    .sort((a, b) => {
      const timestampDifference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return timestampDifference || b.id.localeCompare(a.id);
    })[0];
  const isEligibleToBid = !!userQuote || !!userLatestBid || !!rankings.find((r) => r.supplier_id === user?.id);
  const userPreviousBid = userLatestBid ? userLatestBid.bid_amount : (userQuote ? userQuote.total_amount : undefined);

  // Find user's current ranking label
  const userRankItem = rankings.find((r) => r.supplier_id === user?.id);
  const userRankLabel = userRankItem?.rank_label;

  const config = rfq.auction_config;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Extension Notification Toast Banner */}
      {extensionNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{extensionNotice}</span>
          </div>
          <button onClick={() => setExtensionNotice(null)} className="text-amber-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/auctions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Auction Listing
        </Link>

        {/* Live WS Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
            }`}
          />
          <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
            {isConnected ? 'LIVE WEBSOCKET STREAMING' : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* Main Auction Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                {rfq.reference_id}
              </span>
              <StatusBadge status={rfq.status} size="lg" />
              {config && (
                <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  Trigger: <strong>{config.trigger_type.replace(/_/g, ' ')}</strong>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{rfq.name}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <div>
                Service Date: <strong className="text-slate-200">{new Date(rfq.pickup_service_date).toLocaleDateString()}</strong>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <div>
                Bid Start: <span className="font-mono text-slate-300">{new Date(parseUTC(rfq.bid_start_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <div>
                Participants: <strong className="text-slate-200">{rankings.length} suppliers</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isBuyer && rfq.status === 'DRAFT' && (
              <button
                onClick={handlePublishRFQ}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 transition-all cursor-pointer"
              >
                Publish Auction
              </button>
            )}

            {isBuyer && isClosed && (
              <button
                onClick={() => setIsWinnerModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-4 h-4" />{' '}
                {result?.selection_status === 'SELECTED' ? 'Contract Awarded' : 'Award Winner'}
              </button>
            )}

            {!isBuyer && isClosed && result?.selection_status === 'SELECTED' && (
              <button
                onClick={() => setIsWinnerModalOpen(true)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  result.winning_supplier_id === user?.id
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <Trophy className="w-4 h-4" />{' '}
                {result.winning_supplier_id === user?.id ? '🎉 You Won - View Award' : 'View Award Details'}
              </button>
            )}

            {!isBuyer && isAuctionActive && !isEligibleToBid && (
              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" /> Submit Quotation Breakdown
              </button>
            )}

            {isBuyer && !isClosed && (
              <button
                onClick={() => setIsDateDialogOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Open fast date dialog to adjust closing time"
              >
                <Calendar className="w-4 h-4 text-indigo-400" /> Adjust Closing Time
              </button>
            )}

            <button
              onClick={handleCheckClosure}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
              title="Test evaluate closing conditions"
            >
              Check Closure Status
            </button>
          </div>
        </div>
      </div>

      {/* Countdown Timer Component */}
      <CountdownTimer
        closeTime={rfq.current_bid_close_at}
        forcedCloseTime={rfq.forced_close_at}
        triggerWindowMinutes={config?.trigger_window_minutes || 10}
        extensionMinutes={config?.extension_duration_minutes || 5}
        status={rfq.status}
        onExpire={handleAutoClose}
      />

      {/* Winner / Award Status Card */}
      {isClosed && result?.selection_status === 'SELECTED' && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
          !isBuyer && result.winning_supplier_id === user?.id
            ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-500/40 text-emerald-200'
            : !isBuyer
            ? 'bg-gradient-to-r from-slate-900 to-rose-950/30 border-rose-500/30 text-slate-300'
            : 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${
              !isBuyer && result.winning_supplier_id === user?.id
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : !isBuyer
                ? 'bg-slate-800 text-rose-400 border-slate-700'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {!isBuyer && result.winning_supplier_id === user?.id
                  ? '🎉 Auction Won!'
                  : !isBuyer
                  ? 'Auction Concluded (Result: Lost)'
                  : 'Contract Officially Awarded'}
              </div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {!isBuyer && result.winning_supplier_id === user?.id
                  ? `Congratulations! Contract awarded to you at INR ${result.final_bid_amount ? result.final_bid_amount.toLocaleString() : 'N/A'}`
                  : `Awarded to ${result.winning_supplier_name || 'Winning Supplier'} at INR ${result.final_bid_amount ? result.final_bid_amount.toLocaleString() : 'N/A'}`}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsWinnerModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> View Award Certificate
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bidding')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'bidding'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gavel className="w-4 h-4" /> Live Bidding & Rankings ({rankings.length})
        </button>

        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'quotes'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Commercial Quotations ({quotes.length})
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'config'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings2 className="w-4 h-4" /> British Auction Config
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" /> Activity Log ({activityLogs.length})
        </button>
      </div>

      {/* Tab 1: Live Bidding & Rankings */}
      {activeTab === 'bidding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rankings Table (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Current Supplier Rankings</h3>
                  <p className="text-xs text-slate-400">Sorted by lowest competitive bid price (L1 is lowest)</p>
                </div>
                <div className="text-xs font-mono text-emerald-400">
                  L1: {rfq.current_lowest_bid ? `INR ${rfq.current_lowest_bid.toLocaleString()}` : 'None'}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4 text-right">Current Price</th>
                      <th className="py-3 px-4">Last Bid Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {rankings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                          No bids submitted yet. Be the first to place a competitive bid!
                        </td>
                      </tr>
                    ) : (
                      rankings.map((r) => (
                        <tr
                          key={r.supplier_id}
                          className={`hover:bg-slate-800/30 transition-colors ${
                            r.is_current_user ? 'bg-emerald-950/20 border-l-2 border-emerald-500' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-sans">
                            <RankBadge rankLabel={r.rank_label} size="sm" />
                          </td>

                          <td className="py-3.5 px-4 font-sans font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>{r.supplier_name}</span>
                              {r.is_current_user && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold font-sans">
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-sm text-emerald-400">
                            INR {r.current_bid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 text-xs">
                            {new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bidding History Table */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Chronological Bidding History ({bids.length} bids)
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2">
                {bids.map((b) => (
                  <div key={b.id} className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{b.supplier_name}</span>
                      {b.rank_label && <RankBadge rankLabel={b.rank_label} size="sm" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-400">
                        INR {b.bid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(b.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Bidding Console (Right column) */}
          <div>
            {!isBuyer ? (
              <BiddingConsole
                rfqId={rfq.id}
                currentLowestBid={rfq.current_lowest_bid}
                userPreviousBid={userPreviousBid}
                userRankLabel={userRankLabel}
                isEligibleToBid={isEligibleToBid}
                isAuctionActive={isAuctionActive}
                onSubmitBid={async (amount) => {
                  await rfqService.submitBid(rfq.id, amount);
                  await fetchAuctionData();
                }}
                onOpenQuoteModal={() => setIsQuoteModalOpen(true)}
              />
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Buyer Auction Monitor</div>
                <h3 className="text-base font-bold text-white">Live Monitoring Dashboard</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  As the Buyer, you can monitor competing suppliers lowering their prices in real time. All bids are verified server-side against anti-sniping trigger conditions.
                </p>

                {isClosed && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" /> Auction Concluded
                    </div>
                    <div className="text-xs text-slate-300">
                      Lowest bidder:{' '}
                      <strong className="text-white">
                        {result?.winning_supplier_name || (rankings[0]?.supplier_name ?? 'N/A')}
                      </strong>{' '}
                      at{' '}
                      <span className="font-mono text-emerald-400 font-bold">
                        INR {result?.final_bid_amount?.toLocaleString() || rankings[0]?.current_bid_amount?.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsWinnerModalOpen(true)}
                      className="mt-3 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
                    >
                      {result?.selection_status === 'SELECTED' ? 'View Award Details' : 'Confirm Award to Supplier'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Commercial Quotations */}
      {activeTab === 'quotes' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Submitted Quotations Breakdown</h3>
              <p className="text-xs text-slate-400">Detailed commercial charge structure per carrier</p>
            </div>
            {!isBuyer && !isEligibleToBid && isAuctionActive && (
              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
              >
                + Submit Your Quotation
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Carrier Name</th>
                  <th className="py-3 px-4 text-right">Freight Charges</th>
                  <th className="py-3 px-4 text-right">Origin Charges</th>
                  <th className="py-3 px-4 text-right">Destination</th>
                  <th className="py-3 px-4 text-right">Total Baseline Price</th>
                  <th className="py-3 px-4">Transit Time</th>
                  <th className="py-3 px-4">Validity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      No quotations submitted for this RFQ yet.
                    </td>
                  </tr>
                ) : (
                  quotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                        {q.supplier_name || 'Supplier'}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300 font-medium">{q.carrier_name}</td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        INR {q.freight_charges.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        INR {q.origin_charges.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        INR {q.destination_charges.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        INR {q.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-400">{q.transit_time}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-400">{q.validity_text}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: British Auction Configuration */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Parameters & Formula</div>
            <h3 className="text-base font-bold text-white">Dynamic Anti-Sniping Configuration</h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Trigger Window (X):</span>
                <span className="font-mono font-bold text-white">{config?.trigger_window_minutes || 10} minutes</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Extension Duration (Y):</span>
                <span className="font-mono font-bold text-white">{config?.extension_duration_minutes || 5} minutes</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Active Extension Trigger:</span>
                <span className="font-mono font-bold text-emerald-400">{config?.trigger_type || 'BID_RECEIVED'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              New Close = MIN(Current Close + Y, Forced Close)
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Auction Lifecycle Dates</div>
            <h3 className="text-base font-bold text-white">Schedule Boundaries</h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-sans">Bid Start:</span>
                <span className="text-slate-200">{new Date(rfq.bid_start_at).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-sans">Initial Bid Close:</span>
                <span className="text-slate-200">{new Date(rfq.initial_bid_close_at).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex justify-between">
                <span className="text-emerald-300 font-sans">Effective Current Close:</span>
                <span className="text-emerald-400 font-bold">{new Date(rfq.current_bid_close_at).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex justify-between">
                <span className="text-rose-300 font-sans">Forced Close Limit:</span>
                <span className="text-rose-400 font-bold">{new Date(rfq.forced_close_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Chronological Activity Log */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Real-Time Auction Activity Audit Trail</h3>
              <p className="text-xs text-slate-400">Complete immutable record of bids, ranking changes, and time extensions</p>
            </div>
            <span className="text-xs font-mono text-slate-500">{activityLogs.length} events logged</span>
          </div>

          <ActivityFeed logs={activityLogs} />
        </div>
      )}

      {/* Modals */}
      <SubmitQuoteModal
        rfqId={rfq.id}
        rfqName={rfq.name}
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        onSuccess={fetchAuctionData}
      />

      <SelectWinnerModal
        rfqId={rfq.id}
        rfqName={rfq.name}
        rankings={rankings}
        result={result}
        isOpen={isWinnerModalOpen}
        onClose={() => setIsWinnerModalOpen(false)}
        onSuccess={fetchAuctionData}
      />

      {isDateDialogOpen && rfq && (
        <DateTimeDialog
          isOpen={true}
          onClose={() => setIsDateDialogOpen(false)}
          title={`Adjust Closing Time - ${rfq.reference_id}`}
          currentValue={new Date(rfq.current_bid_close_at).toISOString().slice(0, 16)}
          fieldRole="close"
          onSelect={handleScheduleUpdate}
        />
      )}
    </div>
  );
};
