/**
 * AppShell — sidebar + topbar layout for the authenticated dashboard.
 */
import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  Plus,
  LogOut,
  Settings,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../lib/utils';
import Logo from '../ui/Logo';
import './AppShell.css';

const ROLE_LABELS = {
  customer: 'Customer',
  agent: 'Support Agent',
  admin: 'Administrator',
};

export default function AppShell({ children, sidebarItems = [] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const activePath = user?.role === 'customer' ? '/app/customer'
    : user?.role === 'agent' ? '/app/agent'
    : user?.role === 'admin' ? '/app/admin'
    : '/app';

  return (
    <div className="app-shell">
      <aside className={`app-shell__sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="app-shell__sidebar-head">
          <Logo to={activePath} />
          <button
            type="button"
            className="app-shell__sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="app-shell__nav">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-shell__nav-link ${isActive ? 'is-active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="app-shell__nav-icon">{item.icon}</span>
              <span className="app-shell__nav-label">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="app-shell__nav-badge">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="app-shell__sidebar-foot">
          <div className="app-shell__user">
            <div
              className="app-shell__avatar"
              style={{ background: user?.avatarColor || 'var(--color-primary)' }}
            >
              {initials(user?.name)}
            </div>
            <div className="app-shell__user-info">
              <span className="app-shell__user-name">{user?.name}</span>
              <span className="app-shell__user-role">{ROLE_LABELS[user?.role] || user?.role}</span>
            </div>
          </div>
          <button
            type="button"
            className="app-shell__logout"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="app-shell__overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="app-shell__main">
        <header className="app-shell__topbar">
          <button
            type="button"
            className="app-shell__topbar-burger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="app-shell__topbar-search">
            <span className="app-shell__topbar-greeting">
              Hi, {user?.name?.split(' ')[0]} 👋
            </span>
          </div>

          <div className="app-shell__topbar-actions">
            <button
              type="button"
              className="app-shell__topbar-btn"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="app-shell__topbar-dot" />
            </button>
            <Link
              to={user?.role === 'customer' ? '/app/customer/new' : '#'}
              className="btn btn-primary btn-sm app-shell__topbar-cta"
              style={{ display: user?.role === 'customer' ? 'inline-flex' : 'none' }}
            >
              <Plus size={16} /> New Ticket
            </Link>
          </div>
        </header>

        <main className="app-shell__content">
          {children}
        </main>
      </div>
    </div>
  );
}
