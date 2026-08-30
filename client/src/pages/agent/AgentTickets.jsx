/**
 * AgentTickets — full list of tickets visible to the agent.
 * v2: Live updates + sort + better filters.
 */
import { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Inbox, Search, ArrowUpDown } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import TicketCard from '../../components/ui/TicketCard';
import FluidTabs from '../../components/anim/FluidTabs';
import { api } from '../../lib/api';
import { useSocketEvents, usePolling } from '../../hooks/useSocket';
import { STATUS_LABELS } from '../../lib/utils';
import '../customer/DashboardCommon.css';

const TABS = [
  { value: '', label: 'All' },
  { value: 'new', label: STATUS_LABELS.new },
  { value: 'assigned', label: STATUS_LABELS.assigned },
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'resolved', label: STATUS_LABELS.resolved },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'priority', label: 'Priority (high to low)' },
];

export default function AgentTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (tab) params.status = tab;
      if (search) params.search = search;
      const data = await api.tickets.list(params);
      let list = data.tickets || [];
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (sort === 'recent') {
        list = list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      } else if (sort === 'oldest') {
        list = list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else if (sort === 'priority') {
        list = list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      }
      setTickets(list);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, search, sort]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useSocketEvents({
    'ticket:new': () => load(true),
    'ticket:updated': () => load(true),
    'ticket:message': () => load(true),
  });

  // Polling fallback
  usePolling(() => load(true), 15000);

  const sidebarItems = [
    { to: '/app/agent', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/app/agent/tickets', label: 'Tickets', icon: <Inbox size={18} /> },
  ];

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div className="dashboard">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-subtitle">
            Tickets assigned to you plus new tickets awaiting triage.
          </p>
        </div>

        <div className="filters-bar">
          <FluidTabs tabs={TABS} value={tab} onChange={setTab} />
          <div className="filters-bar__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search subject, ticket number, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters-bar__sort">
            <ArrowUpDown size={14} />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <span className="filters-bar__count">{tickets.length} ticket{tickets.length === 1 ? '' : 's'}</span>
        </div>

        {error && (
          <div className="alert alert-error"><span>{error}</span></div>
        )}

        {loading ? (
          <div className="tickets-grid">
            {[1,2,3,4].map((i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon"><Inbox size={32} /></div>
            <h3>No tickets found</h3>
            <p>{search || tab ? 'Try adjusting your filters.' : 'All caught up — no tickets to show.'}</p>
          </div>
        ) : (
          <div className="tickets-grid">
            {tickets.map((t) => (
              <TicketCard key={t._id} ticket={t} showCustomer />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
