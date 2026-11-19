import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  ArrowUpRight, 
  Clock, 
  ShieldAlert, 
  DollarSign, 
  FileText,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RFQ } from '../types/auction';
import { rfqService } from '../services/rfqService';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { CreateRFQModal } from '../components/CreateRFQModal';
import { parseUTC } from '../hooks/useCountdown';

export const AuctionListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const data = await rfqService.listRFQs({
        search: search || undefined,
        status: statusFilter || undefined,
        skip: (page - 1) * limit,
        limit,
        order_by: 'created_at',
        order_dir: 'desc',
      });
      setRfqs(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load RFQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQs();
  }, [search, statusFilter, page]);

  const isBuyer = user?.role === 'BUYER';

  // Metrics summary
  const activeCount = rfqs.filter((r) => r.status === 'ACTIVE').length;
  const closedCount = rfqs.filter((r) => r.status === 'CLOSED' || r.status === 'FORCE_CLOSED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" /> Procurement Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">British Auction Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time competitive bidding, anti-sniping dynamic time extensions, and automated supplier rankings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRFQs}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh auctions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isBuyer && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create RFQ
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-400">Total Auctions</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{total}</div>
        </div>
        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Bidding
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{activeCount}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-400">Concluded Auctions</div>
          <div className="text-2xl font-bold font-mono text-slate-300 mt-1">{closedCount}</div>
        </div>
        <div className="bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-4">
          <div className="text-xs font-medium text-indigo-400">Role Mode</div>
          <div className="text-sm font-bold text-white mt-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by RFQ Name or Ref ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: '', label: 'All' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'SCHEDULED', label: 'Scheduled' },
            { id: 'CLOSED', label: 'Closed' },
            { id: 'FORCE_CLOSED', label: 'Force Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auction List Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">RFQ Reference & Title</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Current Lowest (L1)</th>
                <th className="py-3.5 px-4">Current Close Time</th>
                <th className="py-3.5 px-4">Forced Close Limit</th>
                <th className="py-3.5 px-4 text-center">Participation</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading auction listings...
                  </td>
                </tr>
              ) : rfqs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No RFQs match your filters.
                  </td>
                </tr>
              ) : (
                rfqs.map((rfq) => {
                  const closeDate = new Date(parseUTC(rfq.current_bid_close_at));
                  const forcedDate = new Date(parseUTC(rfq.forced_close_at));

                  return (
                    <tr
                      key={rfq.id}
                      onClick={() => navigate(`/auctions/${rfq.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4">
                        <div className="font-mono text-emerald-400 text-xs font-semibold">{rfq.reference_id}</div>
                        <div className="font-semibold text-slate-200 mt-0.5 text-sm group-hover:text-emerald-300 transition-colors">
                          {rfq.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Pickup: {new Date(rfq.pickup_service_date).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <StatusBadge status={rfq.status} />
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-sm">
                        {rfq.current_lowest_bid ? (
                          <span className="text-emerald-400">
                            INR {rfq.current_lowest_bid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal">No bids</span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{closeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{closeDate.toLocaleDateString()}</div>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500/70" />
                          <span>{forcedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{forcedDate.toLocaleDateString()}</div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-950/50 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span className="text-slate-300 font-mono font-bold">{rfq.total_bids_count}</span>
                          <span className="text-slate-500 text-[10px]">bids</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-slate-300 font-mono font-bold">{rfq.total_quotes_count}</span>
                          <span className="text-slate-500 text-[10px]">quotes</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/auctions/${rfq.id}`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white font-medium text-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          View <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-4 py-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} RFQs
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono px-2">Page {page}</span>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create RFQ Modal */}
      <CreateRFQModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchRFQs}
      />
    </div>
  );
};
