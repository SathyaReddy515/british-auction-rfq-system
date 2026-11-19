import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  Trophy, 
  ArrowDownCircle, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { RFQ } from '../types/auction';
import { rfqService } from '../services/rfqService';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const SupplierDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);
      try {
        const data = await rfqService.listRFQs({ limit: 50 });
        setRfqs(data.items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  const activeAuctions = rfqs.filter((r) => r.status === 'ACTIVE');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
          Supplier Bidding Workstation
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Active Opportunities</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review available freight RFQs, submit competitive quotations, and place downward bids in real time.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-400">Total Available RFQs</div>
          <div className="text-3xl font-bold font-mono text-white mt-1">{rfqs.length}</div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Auctions Open for Bids
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">{activeAuctions.length}</div>
        </div>

        <div className="bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-5">
          <div className="text-xs font-medium text-indigo-400 flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" /> Authenticated Supplier
          </div>
          <div className="text-base font-bold text-white mt-2 truncate">
            {user?.full_name}
          </div>
        </div>
      </div>

      {/* Active Auctions Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Live British Auctions (Open for Bidding)</h3>

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
                        {new Date(rfq.current_bid_close_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    </div>
  );
};
