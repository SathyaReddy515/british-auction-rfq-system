import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Gavel, 
  User, 
  LogOut, 
  Repeat, 
  Shield, 
  Truck, 
  ChevronDown, 
  LayoutDashboard, 
  Layers,
  Bell,
  Check,
  ExternalLink,
  Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rfqService } from '../services/rfqService';
import { AuctionNotification } from '../types/auction';

export const Navbar: React.FC = () => {
  const { user, logout, quickSwitch } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AuctionNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const res = await rfqService.getNotifications();
        setNotifications(res.items || []);
      } catch (err) {
        // Silently fail if unauthenticated or network error
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 8000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const isBuyer = user.role === 'BUYER';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (notif: AuctionNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!notif.read) {
      try {
        await rfqService.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }
    if (notif.payload?.rfq_id) {
      setNotificationsOpen(false);
      navigate(`/auctions/${notif.payload.rfq_id}`);
    }
  };

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 p-0.5 shadow-lg shadow-emerald-950/50">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                  <Gavel className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div>
                <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  BRITISH AUCTION <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">RFQ</span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5 tracking-wider">PROCUREMENT SYSTEM</span>
              </div>
            </Link>

            {/* Navigation links */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/auctions"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  location.pathname === '/auctions' || location.pathname === '/'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-4 h-4" /> All Auctions
              </Link>

              {isBuyer ? (
                <Link
                  to="/buyer"
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    location.pathname === '/buyer'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Buyer Dashboard
                </Link>
              ) : (
                <Link
                  to="/supplier"
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    location.pathname === '/supplier'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Truck className="w-4 h-4" /> Supplier Hub
                </Link>
              )}
            </div>
          </div>

          {/* User Menu & Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setDropdownOpen(false);
                }}
                className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
                  notificationsOpen
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center px-1 animate-pulse shadow-md shadow-emerald-950">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Notifications
                      </span>
                    </div>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {unreadCount} unread
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">All caught up</span>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const payload = notif.payload;
                        const isWin = payload?.winner_supplier_id === user.id;

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleMarkAsRead(notif)}
                            className={`p-3.5 hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-3 ${
                              !notif.read ? 'bg-slate-800/20' : ''
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isWin
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              <Trophy className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-xs font-bold truncate ${
                                    isWin ? 'text-emerald-300' : 'text-slate-200'
                                  }`}
                                >
                                  {isWin ? '🎉 You Won the Auction!' : 'Auction Concluded'}
                                </span>
                                {!notif.read && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                )}
                              </div>

                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                                {payload?.rfq_name || payload?.rfq_reference_id || 'Auction'} has been awarded to{' '}
                                <strong className="text-slate-200">
                                  {isWin ? 'you' : payload?.winner_supplier_name || 'Winning Supplier'}
                                </strong>
                                {payload?.final_amount
                                  ? ` at INR ${payload.final_amount.toLocaleString()}`
                                  : ''}
                                .
                              </p>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                                <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-emerald-400 hover:underline flex items-center gap-0.5">
                                  View Auction <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 font-medium transition-colors cursor-pointer"
              >
                <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Switch Demo Role:</span>
                <span className="font-semibold text-white">
                  {user.role === 'BUYER' ? 'Buyer (Acme)' : user.full_name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Instant Demo Accounts
                  </div>
                  <button
                    onClick={() => {
                      quickSwitch('buyer@demo.com');
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                      user.email === 'buyer@demo.com'
                        ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400" /> Buyer (Acme Procurement)
                  </button>
                  <button
                    onClick={() => {
                      quickSwitch('supplier1');
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                      user.email === 'supplier1@demo.com'
                        ? 'bg-emerald-600/20 text-emerald-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-400" /> Supplier 1 (FastTrack)
                  </button>
                  <button
                    onClick={() => {
                      quickSwitch('supplier2');
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                      user.email === 'supplier2@demo.com'
                        ? 'bg-emerald-600/20 text-emerald-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-400" /> Supplier 2 (Apex Freight)
                  </button>
                  <button
                    onClick={() => {
                      quickSwitch('supplier3');
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                      user.email === 'supplier3@demo.com'
                        ? 'bg-emerald-600/20 text-emerald-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-400" /> Supplier 3 (BlueDart)
                  </button>
                </div>
              )}
            </div>

            {/* User role badge & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isBuyer
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {user.role}
              </span>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
