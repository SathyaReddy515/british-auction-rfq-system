import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Gavel, 
  User, 
  LogOut, 
  Repeat, 
  Shield, 
  Truck, 
  ChevronDown,
  LayoutDashboard,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, quickSwitch } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!user) return null;

  const isBuyer = user.role === 'BUYER';

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

          {/* User Menu & Demo Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
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

            {/* User role badge */}
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
