/**
 * AgentHelperPanel — AI assistant for support agents.
 *
 * Features:
 *   - "Suggest Reply" — generates a draft reply using Gemini
 *   - "Draft Resolution" — generates a resolution note using Gemini
 *   - "Summarize Thread" — summarizes the conversation so far
 *   - "Similar Tickets" — shows similar tickets (keyword-based)
 *
 * Powered by server-side Gemini calls (the API key never reaches the
 * frontend — keeps it safe).
 */
import { useState } from 'react';
import {
  Sparkles, MessageSquarePlus, FileCheck2, ListTree,
  RefreshCw, AlertCircle, ArrowRight, Lightbulb,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../ui/StatusBadge';
import { timeAgo } from '../../lib/utils';
import './AgentHelperPanel.css';

const TABS = [
  { id: 'reply', label: 'Suggest Reply', icon: <MessageSquarePlus size={14} /> },
  { id: 'resolution', label: 'Draft Resolution', icon: <FileCheck2 size={14} /> },
  { id: 'summary', label: 'Summarize', icon: <ListTree size={14} /> },
  { id: 'similar', label: 'Similar Tickets', icon: <Lightbulb size={14} /> },
];

export default function AgentHelperPanel({ ticket, onUseSuggestion }) {
  const [activeTab, setActiveTab] = useState('reply');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [similar, setSimilar] = useState([]);
  const [loadedTab, setLoadedTab] = useState('');

  const runAction = async (tab) => {
    setLoading(true);
    setError('');
    setSuggestion('');
    setSimilar([]);
    setActiveTab(tab);

    try {
      if (tab === 'reply') {
        const data = await api.tickets.suggestReply(ticket._id);
        setSuggestion(data.suggestion);
      } else if (tab === 'resolution') {
        const data = await api.tickets.draftResolution(ticket._id);
        setSuggestion(data.draft);
      } else if (tab === 'summary') {
        const data = await api.tickets.summarizeThread(ticket._id);
        setSuggestion(data.summary);
      } else if (tab === 'similar') {
        const data = await api.tickets.findSimilar(ticket._id);
        setSimilar(data.similar || []);
      }
      setLoadedTab(tab);
    } catch (err) {
      setError(err.message || 'AI helper unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load similar tickets on mount (no LLM cost — just keyword match)
  useState(() => {
    runAction('similar');
  });

  const handleUseSuggestion = () => {
    if (suggestion && onUseSuggestion) {
      onUseSuggestion(suggestion);
    }
  };

  return (
    <div className="agent-helper card">
      <div className="agent-helper__head">
        <div className="agent-helper__title">
          <span className="agent-helper__icon">
            <Sparkles size={16} />
          </span>
          <div>
            <h3>AI Agent Helper</h3>
            <span className="agent-helper__subtitle">Powered by Gemini</span>
          </div>
        </div>
      </div>

      <div className="agent-helper__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`agent-helper__tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => {
              if (loadedTab !== tab.id || tab === 'reply' || tab === 'resolution' || tab === 'summary') {
                runAction(tab.id);
              } else {
                setActiveTab(tab.id);
              }
            }}
            disabled={loading}
          >
            <span className="agent-helper__tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="agent-helper__body">
        {loading && (
          <div className="agent-helper__loading">
            <div className="spinner spinner-sm" />
            <span>Gemini is thinking…</span>
          </div>
        )}

        {!loading && error && (
          <div className="agent-helper__error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && activeTab === 'similar' && (
          <div className="agent-helper__similar">
            {similar.length === 0 ? (
              <p className="agent-helper__empty">No similar tickets found.</p>
            ) : (
              <div className="agent-helper__similar-list">
                {similar.map(({ ticket: t, score }) => (
                  <Link
                    key={t._id}
                    to={`/app/ticket/${t._id}`}
                    className="agent-helper__similar-item"
                  >
                    <div className="agent-helper__similar-head">
                      <span className="agent-helper__similar-num">{t.ticketNumber}</span>
                      <span className="agent-helper__similar-score">
                        {Math.round(score * 100)}% match
                      </span>
                    </div>
                    <p className="agent-helper__similar-subject">{t.subject}</p>
                    <div className="agent-helper__similar-meta">
                      <StatusBadge status={t.status} />
                      <span className="agent-helper__similar-time">{timeAgo(t.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !error && suggestion && activeTab !== 'similar' && (
          <div className="agent-helper__result">
            <p className="agent-helper__suggestion">{suggestion}</p>
            {(activeTab === 'reply' || activeTab === 'resolution') && (
              <div className="agent-helper__actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleUseSuggestion}
                >
                  <ArrowRight size={14} />
                  {activeTab === 'reply' ? 'Use as reply' : 'Use as resolution'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => runAction(activeTab)}
                  disabled={loading}
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !suggestion && activeTab !== 'similar' && (
          <div className="agent-helper__placeholder">
            <Sparkles size={28} />
            <p>Click the action above to generate a {activeTab === 'reply' ? 'reply' : activeTab === 'resolution' ? 'resolution note' : 'summary'}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
