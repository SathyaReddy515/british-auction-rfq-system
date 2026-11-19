import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuctionListing } from './pages/AuctionListing';
import { AuctionDetails } from './pages/AuctionDetails';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { SupplierDashboard } from './pages/SupplierDashboard';

const ProtectedLayout: React.FC<{ children: React.ReactNode; requiredRole?: 'BUYER' | 'SUPPLIER' }> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/auctions" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        British Auction in RFQ Management System • Anti-Sniping Dynamic Extension Engine
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedLayout>
                <AuctionListing />
              </ProtectedLayout>
            }
          />
          <Route
            path="/auctions"
            element={
              <ProtectedLayout>
                <AuctionListing />
              </ProtectedLayout>
            }
          />
          <Route
            path="/auctions/:id"
            element={
              <ProtectedLayout>
                <AuctionDetails />
              </ProtectedLayout>
            }
          />
          <Route
            path="/buyer"
            element={
              <ProtectedLayout requiredRole="BUYER">
                <BuyerDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/supplier"
            element={
              <ProtectedLayout requiredRole="SUPPLIER">
                <SupplierDashboard />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/auctions" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
