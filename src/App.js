import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sales from './components/Sales';
import Expenses from './components/Expenses';
import Deposits from './components/Deposits';
import TaxInvoices from './components/TaxInvoices';
import ProfitLoss from './components/ProfitLoss';
import Admin from './components/Admin';
import OfficeSales from './components/OfficeSales';
import Layout from './components/Layout';
import InstallPrompt from './components/InstallPrompt';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataCacheProvider } from './context/DataCacheContext';
import './App.css';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function isAdminUser(user) {
  return user?.role === 'admin' || user?.email?.toLowerCase().includes('admin');
}

function IndexRedirect() {
  const { user } = useAuth();
  if (user?.role === 'office') return <Navigate to="/office-sales" replace />;
  if (isAdminUser(user)) return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

function BranchOnlyRoute({ children }) {
  const { user } = useAuth();
  if (isAdminUser(user)) return <Navigate to="/admin" replace />;
  return children;
}

/** เฉพาะแอดมินเท่านั้นเข้า /admin ได้ — สาขา/ออฟฟิศถูก redirect ไป dashboard หรือ office-sales */
function AdminOnlyRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user?.role === 'office') return <Navigate to="/office-sales" replace />;
  if (!isAdminUser(user)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : (isAdminUser(user) ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />)} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<IndexRedirect />} />
        <Route path="dashboard" element={<BranchOnlyRoute><Dashboard /></BranchOnlyRoute>} />
        <Route path="sales" element={<BranchOnlyRoute><Sales /></BranchOnlyRoute>} />
        <Route path="expenses" element={<BranchOnlyRoute><Expenses /></BranchOnlyRoute>} />
        <Route path="deposits" element={<BranchOnlyRoute><Deposits /></BranchOnlyRoute>} />
        <Route path="tax-invoices" element={<BranchOnlyRoute><TaxInvoices /></BranchOnlyRoute>} />
        <Route path="profit-loss" element={<BranchOnlyRoute><ProfitLoss /></BranchOnlyRoute>} />
        <Route path="admin" element={<AdminOnlyRoute><Admin /></AdminOnlyRoute>} />
        <Route path="office-sales" element={<OfficeSales />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataCacheProvider>
          <AppRoutes />
          <InstallPrompt />
        </DataCacheProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

