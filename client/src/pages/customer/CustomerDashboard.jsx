/**
 * CustomerDashboard — overview for customer users.
 * v2: Real-time updates via Socket.IO + activity feed + better stats.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Ticket as TicketIcon, Plus, Clock, CheckCircle2, MessageSquare,
  Sparkles, TrendingUp, ArrowRight, RefreshCw,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import TicketCard from '../../components/ui/TicketCard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import { api } from '../../lib/api';
import { useSocketEvents, usePolling } from '../../hooks/useSocket';
import '../customer/DashboardCommon.css';

const POLL_INTERVAL = 12000;

export default function CustomerDashboard() {
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsData, ticketsData] = await Promise.all([
        api.stats(),
        api.tickets.list({ status: '' }),
      ]);
      setStats(statsData);
      setTickets((ticketsData.tickets || []).slice(0, 6));
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time refresh on socket events
  useSocketEvents({
    'ticket:new': () => load(true),
    'ticket:updated': () => load(true),
    'ticket:message': () => load(true),
  });

  // Polling fallback (for Vercel where Socket.IO isn't available)
  usePolling(() => load(true), POLL_INTERVAL);

  const sidebarItems = [
    { to: '/app/customer', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/app/customer/tickets', label: 'My Tickets', icon: <TicketIcon size={18} />, badge: stats?.totals?.all || undefined },
    { to: '/app/customer/new', label: 'New Ticket', icon: <Plus size={18} /> },
  ];

  const resolutionRate = stats?.totals?.all
    ? Math.round((stats.totals.resolved / stats.totals.all) * 100)
    : 0;

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div className="dashboard">
        <div className="dashboard__head">
          <div>
            <h1 className="dashboard__title">Your support center</h1>
            <p className="dashboard__subtitle">
              Track your tickets, view AI suggestions, and chat with support agents in real time.
            </p>
          </div>
          <div className="dashboard__head-actions">
            {lastUpdated && (
              <span className="dashboard__last-updated">
                <span className="pulse-dot" style={{ width: 6, height: 6, background: 'var(--color-success)', borderRadius: '50%', display: 'inline-block' }} />
                Live · updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => load()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
            <Link to="/app/customer/new" className="btn btn-primary">
              <Plus size={18} />
              New Ticket
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="stats-row">
          <StatCard label="Total Tickets" value={stats?.totals?.all ?? '—'} icon={<TicketIcon size={20} />} color="var(--color-primary)" />
          <StatCard label="Open" value={stats?.totals?.open ?? '—'} icon={<Clock size={20} />} color="var(--color-warning)" />
          <StatCard label="Resolved" value={stats?.totals?.resolved ?? '—'} icon={<CheckCircle2 size={20} />} color="var(--color-success)" />
          <StatCard label="Resolution Rate" value={`${resolutionRate}%`} icon={<TrendingUp size={20} />} color="var(--color-purple)" />
        </div>

        {/* Two-column: recent tickets + activity feed */}
        <div className="dashboard__two-col">
          <div className="dashboard__section">
            <div className="dashboard__section-head">
              <h2 className="dashboard__section-title">Recent tickets</h2>
              <Link to="/app/customer/tickets" className="btn btn-ghost btn-sm">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="tickets-grid">
                {[1,2,3].map((i) => (
                  <div key={i} className="skeleton skeleton-card" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <TicketIcon size={32} />
                </div>
                <h3>No tickets yet</h3>
                <p>Submit your first ticket and our AI will triage it instantly.</p>
                <Link to="/app/customer/new" className="btn btn-primary">
                  <Plus size={16} />
                  Create your first ticket
                </Link>
              </div>
            ) : (
              <div className="tickets-grid">
                {tickets.map((t) => (
                  <TicketCard key={t._id} ticket={t} />
                ))}
              </div>
            )}
          </div>

          <ActivityFeed limit={6} title="Recent activity" />
        </div>

        {/* AI helper CTA */}
        <div className="dashboard__ai-cta">
          <div className="dashboard__ai-cta-icon">
            <Sparkles size={24} />
          </div>
          <div className="dashboard__ai-cta-body">
            <h3>AI-powered triage, every time</h3>
            <p>
              Every ticket you submit is analyzed by Google Gemini to suggest the right
              category, priority, and a concise summary — so agents can help you faster.
            </p>
          </div>
          <Link to="/app/customer/new" className="btn btn-primary">
            Submit a ticket <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card card card-hover">
      <div className="stat-card__icon" style={{ background: `${color}1a`, color }}>
        {icon}
      </div>
      <div className="stat-card__body">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
      </div>
    </div>
  );
}
