import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';

import Preloader from './components/Preloader';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerTickets from './pages/customer/CustomerTickets';
import NewTicketPage from './pages/customer/NewTicketPage';

import AgentDashboard from './pages/agent/AgentDashboard';
import AgentTickets from './pages/agent/AgentTickets';

import AdminDashboard from './pages/admin/AdminDashboard';

import TicketDetailPage from './pages/shared/TicketDetailPage';
import NotFoundPage from './pages/NotFoundPage';

import ScrollToTop from './components/utils/ScrollToTop';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    // Redirect to user's correct dashboard
    const path = user.role === 'customer' ? '/app/customer'
      : user.role === 'agent' ? '/app/agent'
      : user.role === 'admin' ? '/app/admin'
      : '/app';
    return <Navigate to={path} replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) {
    const path = user.role === 'customer' ? '/app/customer'
      : user.role === 'agent' ? '/app/agent'
      : user.role === 'admin' ? '/app/admin'
      : '/app';
    return <Navigate to={path} replace />;
  }
  return children;
}

export default function App() {
  const location = useLocation();

  // Scroll to top on route change (when not using Lenis on a route)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <>
      <Preloader />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

        {/* Customer */}
        <Route path="/app/customer" element={<ProtectedRoute roles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/app/customer/tickets" element={<ProtectedRoute roles={['customer']}><CustomerTickets /></ProtectedRoute>} />
        <Route path="/app/customer/new" element={<ProtectedRoute roles={['customer']}><NewTicketPage /></ProtectedRoute>} />

        {/* Agent */}
        <Route path="/app/agent" element={<ProtectedRoute roles={['agent']}><AgentDashboard /></ProtectedRoute>} />
        <Route path="/app/agent/tickets" element={<ProtectedRoute roles={['agent']}><AgentTickets /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/app/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        {/* Shared ticket detail — accessible by all roles with auth checks on backend */}
        <Route path="/app/ticket/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />

        {/* Convenience redirects */}
        <Route path="/app" element={<RoleRedirect />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const path = user.role === 'customer' ? '/app/customer'
    : user.role === 'agent' ? '/app/agent'
    : user.role === 'admin' ? '/app/admin'
    : '/';
  return <Navigate to={path} replace />;
}
