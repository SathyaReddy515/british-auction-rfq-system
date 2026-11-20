import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  Trophy, 
  ArrowDownCircle, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Award,
  Bell,
  Sparkles
} from 'lucide-react';
import { RFQ, AuctionNotification } from '../types/auction';
import { rfqService } from '../services/rfqService';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { parseUTC } from '../hooks/useCountdown';

export const SupplierDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [notifications, setNotifications] = useState<AuctionNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rfqData, notifData] = await Promise.all([
          rfqService.listRFQs({ limit: 50 }),
          rfqService.getNotifications().catch(() => ({ items: [] }))
        ]);
        setRfqs(rfqData.items);
        setNotifications(notifData.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeAuctions = rfqs.filter((r) => r.status === 'ACTIVE');
  const closedAuctions = rfqs.filter((r) => r.status === 'CLOSED' || r.status === 'FORCE_CLOSED');

  // Match notification outcome per RFQ
  const getAuctionOutcome = (rfqId: string) => {
    const notif = notifications.find(
      (n) => n.payload?.rfq_id === rfqId && n.category === 'AWARD'
    );
    if (!notif) return null;
    const isWinner = notif.payload.winner_supplier_id === user?.id;
    return {
      isWinner,
      winnerName: notif.payload.winner_supplier_name || 'Winning Supplier',
      finalAmount: notif.payload.final_amount,
      awardedAt: notif.payload.awarded_at,
    };
  };

  // Recent wins for highlight banner
  const recentWin = notifications.find(
    (n) => n.category === 'AWARD' && n.payload?.winner_supplier_id === user?.id
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
          Supplier Bidding Workstation
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Active Opportunities</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review available freight RFQs, submit competitive quotations, and monitor contract award decisions in real time.
        </p>
      </div>

      {/* Recent Win Notification Alert Banner */}
      {recentWin && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Contract Award Notification
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OFFICIALLY WON
                </span>
              </div>
              <h4 className="text-base font-bold text-white mt-0.5">
                Congratulations! You were awarded the contract for{' '}
                <span className="text-emerald-300">{recentWin.payload?.rfq_name || 'an RFQ'}</span>.
              </h4>
              {recentWin.payload?.final_amount && (
                <p className="text-xs text-slate-300 mt-0.5">
                  Final contract amount: <strong className="font-mono text-emerald-400">INR {recentWin.payload.final_amount.toLocaleString()}</strong>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate(`/auctions/${recentWin.payload?.rfq_id}`)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            View Winning Auction <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-400">Total RFQs</div>
          <div className="text-3xl font-bold font-mono text-white mt-1">{rfqs.length}</div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Open Auctions
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">{activeAuctions.length}</div>
        </div>

        <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-5">
          <div className="text-xs font-medium text-amber-400 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" /> Contracts Awarded
          </div>
          <div className="text-3xl font-bold font-mono text-amber-300 mt-1">
            {notifications.filter((n) => n.payload?.winner_supplier_id === user?.id).length}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-5">
          <div className="text-xs font-medium text-indigo-400 flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" /> Active Account
          </div>
          <div className="text-base font-bold text-white mt-2 truncate">
            {user?.full_name}
          </div>
        </div>
      </div>

      {/* Active Auctions Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          Live British Auctions (Open for Bidding)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeAuctions.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
              No auctions are currently in ACTIVE status. Check back soon or view scheduled auctions.
            </div>
          ) : (
            activeAuctions.map((rfq) => (
              <div
                key={rfq.id}
                onClick={() => navigate(`/auctions/${rfq.id}`)}
                className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-emerald-950/20 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {rfq.reference_id}
                    </span>
                    <StatusBadge status={rfq.status} size="sm" />
                  </div>

                  <h4 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {rfq.name}
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                    <div>
                      <div className="text-slate-400">Current Lowest (L1)</div>
                      <div className="font-mono font-bold text-emerald-400 mt-0.5">
                        {rfq.current_lowest_bid ? `INR ${rfq.current_lowest_bid.toLocaleString()}` : 'No bids yet'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Closes At</div>
                      <div className="font-mono font-semibold text-slate-200 mt-0.5">
                        {new Date(parseUTC(rfq.current_bid_close_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Service: {new Date(rfq.pickup_service_date).toLocaleDateString()}
                  </span>

                  <button className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer">
                    Join Bidding <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Concluded Auctions with Won / Lost Outcomes */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Concluded Auctions & Results
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {closedAuctions.length === 0 ? (
            <div className="col-span-2 py-10 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
              No concluded auctions yet.
            </div>
          ) : (
            closedAuctions.map((rfq) => {
              const outcome = getAuctionOutcome(rfq.id);

              return (
                <div
                  key={rfq.id}
                  onClick={() => navigate(`/auctions/${rfq.id}`)}
                  className={`bg-slate-900/80 border rounded-2xl p-6 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between ${
                    outcome?.isWinner
                      ? 'border-emerald-500/40 hover:border-emerald-400 shadow-emerald-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-400 text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {rfq.reference_id}
                      </span>

                      {outcome ? (
                        outcome.isWinner ? (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                            <Trophy className="w-3.5 h-3.5 text-emerald-400" /> WON
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            LOST
                          </span>
                        )
                      ) : (
                        <StatusBadge status={rfq.status} size="sm" />
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-white">{rfq.name}</h4>

                    {/* Outcome Detail Box */}
                    <div className="text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                      {outcome ? (
                        outcome.isWinner ? (
                          <>
                            <div className="text-emerald-300 font-bold flex items-center gap-1">
                              🎉 Contract Awarded to You!
                            </div>
                            <div className="text-slate-400">
                              Award amount:{' '}
                              <span className="font-mono font-bold text-white">
                                {outcome.finalAmount
                                  ? `INR ${outcome.finalAmount.toLocaleString()}`
                                  : 'Confirmed'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-slate-400">
                              Winning Supplier:{' '}
                              <span className="text-white font-semibold">{outcome.winnerName}</span>
                            </div>
                            {outcome.finalAmount && (
                              <div className="text-slate-400">
                                Final Price:{' '}
                                <span className="font-mono font-bold text-slate-300">
                                  INR {outcome.finalAmount.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        <div className="text-slate-400">
                          Auction concluded. Award selection pending or not participated.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Service: {new Date(rfq.pickup_service_date).toLocaleDateString()}
                    </span>

                    <button className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1 cursor-pointer">
                      View Auction Details <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
