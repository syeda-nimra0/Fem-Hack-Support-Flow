/**
 * AdminDashboard — global overview for administrators.
 * v2: Real-time updates, activity feed, AI insights, better layout.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, Users, Clock, CheckCircle2, AlertCircle, TrendingUp,
  Sparkles, ArrowRight, RefreshCw, Zap, Bot,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import TicketCard from '../../components/ui/TicketCard';
import DonutChart from '../../components/anim/DonutChart';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import { api } from '../../lib/api';
import { useSocketEvents, usePolling } from '../../hooks/useSocket';
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../../lib/utils';
import '../customer/DashboardCommon.css';
import './AdminDashboard.css';

const POLL_INTERVAL = 12000;

export default function AdminDashboard() {
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
        api.tickets.list(),
      ]);
      setStats(statsData);
      setTickets(ticketsData.tickets || []);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvents({
    'ticket:new': () => load(true),
    'ticket:updated': () => load(true),
    'ticket:message': () => load(true),
  });

  // Polling fallback
  usePolling(() => load(true), POLL_INTERVAL);

  const sidebarItems = [
    { to: '/app/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/app/agent/tickets', label: 'All Tickets', icon: <Inbox size={18} />, badge: stats?.totals?.all || undefined },
  ];

  const resolvedPct = stats?.totals?.all
    ? Math.round((stats.totals.resolved / stats.totals.all) * 100)
    : 0;

  const recentTickets = tickets.slice(0, 6);
  const categoryEntries = Object.entries(stats?.byCategory || {});
  const maxCategory = Math.max(...categoryEntries.map(([, c]) => c), 1);
  const unassignedCount = tickets.filter((t) => !t.assignedAgent && t.status === 'new').length;

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div className="dashboard">
        <div className="dashboard__head">
          <div>
            <h1 className="dashboard__title">Admin overview</h1>
            <p className="dashboard__subtitle">
              Global view of all tickets, agents, and customer activity — live.
            </p>
          </div>
          <div className="dashboard__head-actions">
            {lastUpdated && (
              <span className="dashboard__last-updated">
                <span className="pulse-dot" style={{ width: 6, height: 6, background: 'var(--color-success)', borderRadius: '50%', display: 'inline-block' }} />
                Live · {lastUpdated.toLocaleTimeString()}
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
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Top stats */}
        <div className="stats-row">
          <StatCard label="Total Tickets" value={stats?.totals?.all ?? '—'} icon={<Inbox size={20} />} color="var(--color-primary)" />
          <StatCard label="Open" value={stats?.totals?.open ?? '—'} icon={<Clock size={20} />} color="var(--color-warning)" />
          <StatCard label="Resolved" value={stats?.totals?.resolved ?? '—'} icon={<CheckCircle2 size={20} />} color="var(--color-success)" />
          <StatCard label="Avg Resolution" value={stats?.avgResolutionHours ? `${stats.avgResolutionHours}h` : '—'} icon={<TrendingUp size={20} />} color="var(--color-purple)" />
        </div>

        {/* Charts row */}
        <div className="admin-grid">
          {/* Resolution donut */}
          <div className="card admin-card">
            <h3 className="admin-card__title">Resolution rate</h3>
            <div className="admin-card__chart">
              <DonutChart
                size={180}
                progress={resolvedPct}
                progressColor="var(--color-success)"
                progressWidth={12}
                circleWidth={12}
              >
                <span className="admin-card__chart-pct">{resolvedPct}%</span>
                <span className="admin-card__chart-label">Resolved</span>
              </DonutChart>
            </div>
            <div className="admin-card__breakdown">
              <div className="admin-card__breakdown-row">
                <span className="badge badge-status-resolved">Resolved</span>
                <span>{stats?.totals?.resolved || 0}</span>
              </div>
              <div className="admin-card__breakdown-row">
                <span className="badge badge-status-in_progress">Open</span>
                <span>{stats?.totals?.open || 0}</span>
              </div>
            </div>
          </div>

          {/* Status distribution */}
          <div className="card admin-card">
            <h3 className="admin-card__title">Status distribution</h3>
            <div className="admin-bars">
              {['new', 'assigned', 'in_progress', 'resolved'].map((status) => {
                const count = stats?.byStatus?.[status] || 0;
                const total = stats?.totals?.all || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status} className="admin-bar">
                    <div className="admin-bar__head">
                      <span className={`badge badge-status-${status}`}>
                        {status.replace('_', ' ')}
                      </span>
                      <span className="admin-bar__count">{count}</span>
                    </div>
                    <div className="admin-bar__track">
                      <div
                        className={`admin-bar__fill admin-bar__fill--${status}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority distribution */}
          <div className="card admin-card">
            <h3 className="admin-card__title">Priority distribution</h3>
            <div className="admin-priorities">
              {['high', 'medium', 'low'].map((p) => {
                const count = stats?.byPriority?.[p] || 0;
                const total = stats?.totals?.all || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={p} className="admin-priority">
                    <div className="admin-priority__head">
                      <span className={`badge badge-priority-${p}`}>{PRIORITY_LABELS[p]}</span>
                      <span className="admin-priority__count">{count}</span>
                    </div>
                    <div className="admin-priority__track">
                      <div
                        className={`admin-priority__fill admin-priority__fill--${p}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category distribution */}
          <div className="card admin-card">
            <h3 className="admin-card__title">Category distribution</h3>
            <div className="admin-categories">
              {categoryEntries.length === 0 ? (
                <p className="admin-card__empty">No data yet.</p>
              ) : (
                categoryEntries.map(([cat, count]) => (
                  <div key={cat} className="admin-category">
                    <span className="badge badge-category">{CATEGORY_LABELS[cat] || cat}</span>
                    <div className="admin-category__bar">
                      <div
                        className="admin-category__fill"
                        style={{ width: `${(count / maxCategory) * 100}%` }}
                      />
                    </div>
                    <span className="admin-category__count">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Agents & customers + awaiting triage */}
        <div className="stats-row">
          <StatCard label="Support Agents" value={stats?.agentCount ?? '—'} icon={<Users size={20} />} color="var(--color-info)" />
          <StatCard label="Customers" value={stats?.customerCount ?? '—'} icon={<Users size={20} />} color="var(--color-purple)" />
          <StatCard label="Awaiting Triage" value={unassignedCount} icon={<Zap size={20} />} color="var(--color-warning)" />
          <StatCard label="AI Triage Active" value={stats?.totals?.all ? 'Yes' : '—'} icon={<Bot size={20} />} color="var(--color-primary)" />
        </div>

        {/* Two-column: recent tickets + activity */}
        <div className="dashboard__two-col">
          <div className="dashboard__section">
            <div className="dashboard__section-head">
              <h2 className="dashboard__section-title">Recent tickets</h2>
              <Link to="/app/agent/tickets" className="btn btn-ghost btn-sm">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {loading ? (
              <div className="tickets-grid">
                {[1,2,3].map((i) => (
                  <div key={i} className="skeleton skeleton-card" />
                ))}
              </div>
            ) : (
              <div className="tickets-grid">
                {recentTickets.map((t) => (
                  <TicketCard key={t._id} ticket={t} showCustomer />
                ))}
              </div>
            )}
          </div>

          <ActivityFeed limit={10} title="All activity" />
        </div>

        {/* AI Helper CTA */}
        <div className="dashboard__ai-cta">
          <div className="dashboard__ai-cta-icon">
            <Sparkles size={24} />
          </div>
          <div className="dashboard__ai-cta-body">
            <h3>AI Agent Helper is active</h3>
            <p>
              All agents now have access to Gemini-powered reply suggestions, resolution drafts,
              conversation summaries, and similar ticket detection — right inside each ticket.
            </p>
          </div>
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
