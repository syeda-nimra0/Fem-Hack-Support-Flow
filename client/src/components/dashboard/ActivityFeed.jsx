/**
 * ActivityFeed — shows recent ticket activity (created, updated, resolved).
 * Used on dashboards for a "what's happening now" view.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, MessageSquare, CheckCircle2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { StatusBadge } from '../ui/StatusBadge';
import { timeAgo, initials } from '../../lib/utils';
import './ActivityFeed.css';

const ACTION_CONFIG = {
  created: { icon: <Plus size={14} />, color: 'var(--color-info)', label: 'created' },
  updated: { icon: <MessageSquare size={14} />, color: 'var(--color-warning)', label: 'updated' },
  resolved: { icon: <CheckCircle2 size={14} />, color: 'var(--color-success)', label: 'resolved' },
};

export default function ActivityFeed({ limit = 8, title = 'Recent activity' }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.activity(limit);
      setActivities(data.activities || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh every 30s
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [limit]);

  return (
    <div className="activity-feed card">
      <div className="activity-feed__head">
        <h3 className="activity-feed__title">{title}</h3>
        <button
          type="button"
          className="activity-feed__refresh"
          onClick={load}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {loading && activities.length === 0 ? (
        <div className="activity-feed__loading">
          <div className="spinner spinner-sm" />
        </div>
      ) : error ? (
        <div className="activity-feed__error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : activities.length === 0 ? (
        <p className="activity-feed__empty">No recent activity.</p>
      ) : (
        <ul className="activity-feed__list">
          {activities.map((a, i) => {
            const config = ACTION_CONFIG[a.action] || ACTION_CONFIG.updated;
            return (
              <li key={a._id + i} className="activity-feed__item">
                <span
                  className="activity-feed__icon"
                  style={{ background: `${config.color}1a`, color: config.color }}
                >
                  {config.icon}
                </span>
                <div className="activity-feed__body">
                  <Link to={`/app/ticket/${a._id}`} className="activity-feed__subject">
                    {a.subject}
                  </Link>
                  <div className="activity-feed__meta">
                    <span className="activity-feed__num">{a.ticketNumber}</span>
                    <span className="activity-feed__action">
                      {config.label} {timeAgo(a.time)}
                    </span>
                    {a.customer && (
                      <span className="activity-feed__customer">
                        <span
                          className="activity-feed__avatar"
                          style={{ background: a.customer.avatarColor || 'var(--color-primary)' }}
                        >
                          {initials(a.customer.name)}
                        </span>
                        {a.customer.name}
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
