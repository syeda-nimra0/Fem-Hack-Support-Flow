/**
 * AgentDashboard — overview for support agents.
 * v2: Real-time updates, activity feed, AI Helper CTA, better layout.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, Clock, CheckCircle2, Users, Bot,
  AlertCircle, TrendingUp, Sparkles, ArrowRight, RefreshCw, Zap,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import TicketCard from '../../components/ui/TicketCard';
import DonutChart from '../../components/anim/DonutChart';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import { api } from '../../lib/api';
import { useSocketEvents, usePolling } from '../../hooks/useSocket';
import '../customer/DashboardCommon.css';
import './AgentDashboard.css';

const POLL_INTERVAL = 12000;

export default function AgentDashboard() {
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

  // Real-time refresh
  useSocketEvents({
    'ticket:new': () => load(true),
    'ticket:updated': () => load(true),
    'ticket:message': () => load(true),
  });

  // Polling fallback
  usePolling(() => load(true), POLL_INTERVAL);

  const sidebarItems = [
    { to: '/app/agent', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true, badge: stats?.totals?.open || undefined },
    { to: '/app/agent/tickets', label: 'Tickets', icon: <Inbox size={18} />, badge: stats?.totals?.all || undefined },
  ];

  const unassignedNew = tickets.filter((t) => !t.assignedAgent && t.status === 'new');
  const myActive = tickets.filter((t) => t.assignedAgent && t.status !== 'resolved').slice(0, 6);
  const recentlyResolved = tickets.filter((t) => t.status === 'resolved').slice(0, 3);

  const resolvedPct = stats?.totals?.all
    ? Math.round((stats.totals.resolved / stats.totals.all) * 100)
    : 0;

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div className="dashboard">
        <div className="dashboard__head">
          <div>
            <h1 className="dashboard__title">Agent dashboard</h1>
            <p className="dashboard__subtitle">
              Review AI triage, respond to customers, and resolve tickets — with AI assistance.
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

        {/* Stats row + resolution donut */}
        <div className="agent-grid">
          <div className="agent-stats">
            <StatCard label="Awaiting Triage" value={unassignedNew.length} icon={<Zap size={20} />} color="var(--color-warning)" />
            <StatCard label="My Active" value={myActive.length} icon={<Clock size={20} />} color="var(--color-primary)" />
            <StatCard label="Resolved" value={stats?.totals?.resolved ?? '—'} icon={<CheckCircle2 size={20} />} color="var(--color-success)" />
            <StatCard label="Avg Resolution" value={stats?.avgResolutionHours ? `${stats.avgResolutionHours}h` : '—'} icon={<TrendingUp size={20} />} color="var(--color-purple)" />
          </div>

          <div className="agent-resolution">
            <div className="card agent-resolution__card">
              <div className="agent-resolution__chart">
                <DonutChart
                  size={140}
                  progress={resolvedPct}
                  progressColor="var(--color-success)"
                  progressWidth={10}
                  circleWidth={10}
                >
                  <span className="agent-resolution__pct">{resolvedPct}%</span>
                  <span className="agent-resolution__label">Resolved</span>
                </DonutChart>
              </div>
              <div className="agent-resolution__body">
                <h3>Resolution rate</h3>
                <p>
                  {stats?.totals?.resolved || 0} of {stats?.totals?.all || 0} tickets resolved.
                </p>
                <div className="agent-resolution__breakdown">
                  {Object.entries(stats?.byStatus || {}).map(([status, count]) => (
                    <div key={status} className="agent-resolution__row">
                      <span className={`badge badge-status-${status}`}>
                        {status.replace('_', ' ')}
                      </span>
                      <span className="agent-resolution__count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unassigned tickets needing triage */}
        <div className="dashboard__section">
          <div className="dashboard__section-head">
            <h2 className="dashboard__section-title">
              <Bot size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Awaiting triage
              {unassignedNew.length > 0 && (
                <span className="badge badge-priority-high" style={{ marginLeft: '0.5rem' }}>
                  {unassignedNew.length} new
                </span>
              )}
            </h2>
            <Link to="/app/agent/tickets?status=new" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="tickets-grid">
              {[1,2,3].map((i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))}
            </div>
          ) : unassignedNew.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon"><CheckCircle2 size={32} /></div>
              <h3>All caught up</h3>
              <p>No new tickets waiting for triage. Nice work.</p>
            </div>
          ) : (
            <div className="tickets-grid">
              {unassignedNew.slice(0, 6).map((t) => (
                <TicketCard key={t._id} ticket={t} showCustomer />
              ))}
            </div>
          )}
        </div>

        {/* Two-column: my active + activity */}
        <div className="dashboard__two-col">
          <div className="dashboard__section">
            <div className="dashboard__section-head">
              <h2 className="dashboard__section-title">My active tickets</h2>
              <Link to="/app/agent/tickets" className="btn btn-ghost btn-sm">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="tickets-grid">
                {[1,2].map((i) => (
                  <div key={i} className="skeleton skeleton-card" />
                ))}
              </div>
            ) : myActive.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon"><Inbox size={32} /></div>
                <h3>No active tickets</h3>
                <p>Pick up a ticket from the "Awaiting triage" section above.</p>
              </div>
            ) : (
              <div className="tickets-grid">
                {myActive.map((t) => (
                  <TicketCard key={t._id} ticket={t} showCustomer />
                ))}
              </div>
            )}
          </div>

          <ActivityFeed limit={8} title="Team activity" />
        </div>

        {/* AI Helper CTA */}
        <div className="dashboard__ai-cta">
          <div className="dashboard__ai-cta-icon">
            <Sparkles size={24} />
          </div>
          <div className="dashboard__ai-cta-body">
            <h3>AI Agent Helper — your Gemini-powered assistant</h3>
            <p>
              Open any ticket to access AI-suggested replies, draft resolutions, conversation
              summaries, and similar ticket detection. Saves you time on every ticket.
            </p>
          </div>
          {unassignedNew[0] && (
            <Link to={`/app/ticket/${unassignedNew[0]._id}`} className="btn btn-primary">
              Try it now <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {/* Recently resolved */}
        {recentlyResolved.length > 0 && (
          <div className="dashboard__section">
            <div className="dashboard__section-head">
              <h2 className="dashboard__section-title">Recently resolved</h2>
            </div>
            <div className="tickets-grid">
              {recentlyResolved.map((t) => (
                <TicketCard key={t._id} ticket={t} showCustomer />
              ))}
            </div>
          </div>
        )}
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
