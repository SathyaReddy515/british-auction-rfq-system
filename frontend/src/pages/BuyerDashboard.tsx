import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Layers, 
  Trophy, 
  Clock, 
  ArrowUpRight, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { RFQ } from '../types/auction';
import { rfqService } from '../services/rfqService';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { CreateRFQModal } from '../components/CreateRFQModal';

export const BuyerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchBuyerRFQs = async () => {
    setLoading(true);
    try {
      const data = await rfqService.listRFQs({ buyer_only: true, limit: 50 });
      setRfqs(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyerRFQs();
  }, []);

  const activeAuctions = rfqs.filter((r) => r.status === 'ACTIVE');
  const pendingAward = rfqs.filter((r) => r.status === 'CLOSED' || r.status === 'FORCE_CLOSED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            Buyer Command Center
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Procurement Portfolio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your British Auctions, review quotation breakdowns, and award winning contracts.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 transition-all flex items-center gap-2 cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" /> Create New RFQ
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-medium text-slate-400">Total Created RFQs</div>
          <div className="text-3xl font-bold font-mono text-white mt-1">{rfqs.length}</div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Auctions
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">{activeAuctions.length}</div>
        </div>

        <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-5">
          <div className="text-xs font-medium text-amber-400 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" /> Auctions Ready for Award
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-1">{pendingAward.length}</div>
        </div>
      </div>

      {/* RFQ List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Your Managed RFQs</h3>
          <span className="text-xs font-mono text-slate-400">{rfqs.length} RFQs</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {rfqs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              You haven't created any RFQs yet. Click "Create New RFQ" to get started.
            </div>
          ) : (
            rfqs.map((rfq) => (
              <div
                key={rfq.id}
                onClick={() => navigate(`/auctions/${rfq.id}`)}
                className="p-5 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-emerald-400 text-xs font-bold">{rfq.reference_id}</span>
                    <StatusBadge status={rfq.status} size="sm" />
                  </div>
                  <h4 className="text-base font-bold text-white hover:text-emerald-300 transition-colors">
                    {rfq.name}
                  </h4>
                  <div className="text-xs text-slate-400 flex items-center gap-4">
                    <span>Service: {new Date(rfq.pickup_service_date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Closing: {new Date(rfq.current_bid_close_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-slate-400 uppercase">Current L1 Price</div>
                    <div className="text-base font-bold font-mono text-emerald-400">
                      {rfq.current_lowest_bid ? `INR ${rfq.current_lowest_bid.toLocaleString()}` : 'No bids yet'}
                    </div>
                  </div>

                  <button className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer">
                    Manage <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateRFQModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchBuyerRFQs}
      />
    </div>
  );
};
