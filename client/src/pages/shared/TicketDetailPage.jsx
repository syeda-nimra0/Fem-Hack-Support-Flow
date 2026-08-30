/**
 * TicketDetailPage — the heart of the app.
 *
 * Features:
 *   - Shows ticket subject, status, priority, category, AI suggestion
 *   - Agent can review/edit AI suggestion (category, priority, summary)
 *   - Real-time conversation thread (Socket.IO)
 *   - Agent can change status (with resolution note for "resolved")
 *   - Typing indicator
 *   - Customer can reply
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Bot, RefreshCw, AlertCircle, CheckCircle2,
  Edit3, Save, X, Sparkles, User, Headphones, Clock,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/StatusBadge';
import AgentHelperPanel from '../../components/dashboard/AgentHelperPanel';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS, STATUS_FLOW,
  formatTime, formatDate, initials, nextStatus,
} from '../../lib/utils';
import {
  getSocket, joinTicketRoom, leaveTicketRoom, emitTyping,
} from '../../lib/socket';
import { usePolling } from '../../hooks/useSocket';
import './TicketDetailPage.css';

export default function TicketDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isStaff } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Chat state
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { userId: { name, role, ts } }

  // Triage review state
  const [editingTriage, setEditingTriage] = useState(false);
  const [triageForm, setTriageForm] = useState({ category: '', priority: '', summary: '' });
  const [savingTriage, setSavingTriage] = useState(false);

  // Status change state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [draftingResolution, setDraftingResolution] = useState(false);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const justCreated = location.state?.justCreated;
  const triageError = location.state?.triageError;

  const loadTicket = useCallback(async () => {
    try {
      const data = await api.tickets.get(id);
      setTicket(data.ticket);
      setTriageForm({
        category: data.ticket.aiSuggestion?.category || data.ticket.category,
        priority: data.ticket.aiSuggestion?.priority || data.ticket.priority,
        summary: data.ticket.aiSuggestion?.summary || '',
      });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadTicket();
  }, [loadTicket]);

  // Join socket room and listen for updates
  useEffect(() => {
    if (!ticket?._id) return;
    joinTicketRoom(ticket._id);
    const socket = getSocket();

    const handleMessage = ({ message: newMessage }) => {
      setTicket((prev) => {
        if (!prev) return prev;
        // Avoid duplicates (we already optimistically added it)
        if (prev.messages.some((m) => m._id === newMessage._id)) return prev;
        return { ...prev, messages: [...prev.messages, newMessage] };
      });
    };

    const handleUpdate = ({ ticket: updated }) => {
      setTicket(updated);
    };

    const handleTyping = ({ userId, userName, userRole, isTyping }) => {
      if (userId === user?._id) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[userId] = { name: userName, role: userRole, ts: Date.now() };
        } else {
          delete next[userId];
        }
        return next;
      });
    };

    if (socket) {
      socket.on('ticket:message', handleMessage);
      socket.on('ticket:updated', handleUpdate);
      socket.on('ticket:typing', handleTyping);
    }

    return () => {
      if (socket) {
        socket.off('ticket:message', handleMessage);
        socket.off('ticket:updated', handleUpdate);
        socket.off('ticket:typing', handleTyping);
      }
      leaveTicketRoom(ticket._id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id, user?._id]);

  // Polling fallback: refresh ticket every 8s (for Vercel where Socket.IO isn't available)
  usePolling(async () => {
    if (ticket?._id) {
      try {
        const data = await api.tickets.get(ticket._id);
        // Only update if something changed (compare message count + status)
        const newMsgCount = data.ticket.messages?.length || 0;
        const oldMsgCount = ticket.messages?.length || 0;
        if (newMsgCount !== oldMsgCount || data.ticket.status !== ticket.status) {
          setTicket(data.ticket);
        }
      } catch {
        // Silent fail on polling
      }
    }
  }, 8000, [ticket?._id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [ticket?.messages?.length]);

  // Clean expired typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.ts < 3500) next[k] = v;
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!message.trim() || sendingMessage) return;
    const content = message.trim();
    setMessage('');
    setSendingMessage(true);
    emitTyping(ticket._id, false);

    // Optimistic: append immediately
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      sender: user._id,
      senderRole: user.role,
      senderName: user.name,
      content,
      isInternal: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setTicket((prev) => prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev);

    try {
      const data = await api.tickets.addMessage(ticket._id, { content });
      setTicket(data.ticket);
      setActionError('');
    } catch (err) {
      setActionError(err.message || 'Failed to send message');
      // Remove optimistic message
      setTicket((prev) => prev ? {
        ...prev,
        messages: prev.messages.filter((m) => m._id !== optimisticMsg._id),
      } : prev);
      setMessage(content); // Restore the message
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMessageInput = (e) => {
    setMessage(e.target.value);
    if (!ticket?._id) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(ticket._id, true);
    typingTimeoutRef.current = setTimeout(() => emitTyping(ticket._id, false), 1500);
  };

  const handleSaveTriage = async () => {
    setSavingTriage(true);
    setActionError('');
    try {
      const data = await api.tickets.reviewTriage(ticket._id, {
        category: triageForm.category,
        priority: triageForm.priority,
        summary: triageForm.summary,
        assignToMe: !ticket.assignedAgent,
      });
      setTicket(data.ticket);
      setEditingTriage(false);
      setActionSuccess('AI suggestion reviewed and saved.');
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      setActionError(err.message || 'Failed to save triage');
    } finally {
      setSavingTriage(false);
    }
  };

  const handleRerunTriage = async () => {
    setActionError('');
    setActionSuccess('');
    try {
      const data = await api.tickets.rerunTriage(ticket._id);
      setTicket((prev) => ({
        ...prev,
        aiSuggestion: data.aiSuggestion,
        aiReviewed: false,
      }));
      setTriageForm({
        category: data.aiSuggestion.category,
        priority: data.aiSuggestion.priority,
        summary: data.aiSuggestion.summary,
      });
      setActionSuccess('AI re-analyzed the ticket.');
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      setActionError(err.message || 'AI triage failed');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'resolved') {
      setShowResolveModal(true);
      return;
    }
    setChangingStatus(true);
    setActionError('');
    try {
      const data = await api.tickets.updateStatus(ticket._id, { status: newStatus });
      setTicket(data.ticket);
      setActionSuccess(`Status changed to "${STATUS_LABELS[newStatus]}".`);
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      setActionError(err.message || 'Failed to change status');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) {
      setActionError('Resolution note is required.');
      return;
    }
    setChangingStatus(true);
    setActionError('');
    try {
      const data = await api.tickets.updateStatus(ticket._id, {
        status: 'resolved',
        resolution: resolution.trim(),
      });
      setTicket(data.ticket);
      setShowResolveModal(false);
      setResolution('');
      setActionSuccess('Ticket resolved.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to resolve ticket');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAssign = async () => {
    setActionError('');
    try {
      const data = await api.tickets.assign(ticket._id);
      setTicket(data.ticket);
      setActionSuccess('Ticket assigned to you.');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loading) {
    return (
      <AppShell sidebarItems={[]}>
        <div className="dashboard__loading"><div className="spinner" /></div>
      </AppShell>
    );
  }

  if (error && !ticket) {
    return (
      <AppShell sidebarItems={[]}>
        <div className="empty-state">
          <div className="empty-state__icon"><AlertCircle size={32} /></div>
          <h3>Couldn't load ticket</h3>
          <p>{error}</p>
          <Link to={user?.role === 'customer' ? '/app/customer/tickets' : '/app/agent/tickets'} className="btn btn-primary">
            Back to tickets
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!ticket) return null;

  const canAgentAct = isStaff && (ticket.assignedAgent?._id === user?._id || (!ticket.assignedAgent && ticket.status === 'new'));
  const isResolved = ticket.status === 'resolved';
  const canReply = !isResolved && (user.role === 'customer' || canAgentAct);
  const next = nextStatus(ticket.status);

  const sidebarItems = user?.role === 'customer' ? [
    { to: '/app/customer', label: 'Dashboard', icon: <ArrowLeft size={18} />, end: true },
    { to: '/app/customer/tickets', label: 'My Tickets', icon: <ArrowLeft size={18} /> },
  ] : [
    { to: '/app/agent', label: 'Dashboard', icon: <ArrowLeft size={18} />, end: true },
    { to: '/app/agent/tickets', label: 'Tickets', icon: <ArrowLeft size={18} /> },
  ];

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div className="ticket-detail">
        <Link
          to={user?.role === 'customer' ? '/app/customer/tickets' : '/app/agent/tickets'}
          className="back-link"
        >
          <ArrowLeft size={16} />
          Back to tickets
        </Link>

        {justCreated && (
          <div className="alert alert-info">
            <Sparkles size={18} />
            <span>
              Ticket <strong>{ticket.ticketNumber}</strong> created.
              {triageError
                ? ' AI triage was unavailable — an agent will review manually.'
                : ' AI has analyzed it — see the suggestion below.'}
            </span>
          </div>
        )}

        {actionError && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Ticket header */}
        <div className="ticket-detail__head card">
          <div className="ticket-detail__head-top">
            <span className="ticket-detail__number">{ticket.ticketNumber}</span>
            <div className="ticket-detail__head-badges">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <CategoryBadge category={ticket.category} />
            </div>
          </div>
          <h1 className="ticket-detail__subject">{ticket.subject}</h1>
          <div className="ticket-detail__meta">
            <span className="ticket-detail__meta-item">
              <User size={14} />
              {ticket.customerName}
            </span>
            {ticket.assignedAgent ? (
              <span className="ticket-detail__meta-item">
                <Headphones size={14} />
                {ticket.assignedAgentName}
              </span>
            ) : (
              <span className="ticket-detail__meta-item ticket-detail__meta-item--muted">
                <Headphones size={14} />
                Unassigned
              </span>
            )}
            <span className="ticket-detail__meta-item">
              <Clock size={14} />
              Created {formatDate(ticket.createdAt)}
            </span>
          </div>
        </div>

        <div className="ticket-detail__body">
          {/* Main column: chat */}
          <div className="ticket-detail__main">
            {/* Original description */}
            <div className="card ticket-detail__description">
              <h3 className="ticket-detail__section-title">Original description</h3>
              <p className="ticket-detail__description-text">{ticket.description}</p>
            </div>

            {/* Conversation */}
            <div className="card ticket-detail__conversation">
              <div className="ticket-detail__conversation-head">
                <h3 className="ticket-detail__section-title">Conversation</h3>
                <span className="ticket-detail__conversation-count">
                  {ticket.messages.length} message{ticket.messages.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="ticket-detail__messages">
                {ticket.messages.map((m) => (
                  <MessageBubble key={m._id} message={m} currentUser={user} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicator */}
              {Object.keys(typingUsers).length > 0 && (
                <div className="ticket-detail__typing">
                  {Object.values(typingUsers).slice(0, 2).map((t, i) => (
                    <span key={i}>
                      {t.name} is typing
                      <span className="typing-dots">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Reply box */}
              {canReply ? (
                <form className="ticket-detail__reply" onSubmit={handleSendMessage}>
                  <textarea
                    ref={messageInputRef}
                    className="ticket-detail__reply-input"
                    placeholder={`Reply as ${user.role}…`}
                    value={message}
                    onChange={handleMessageInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={3}
                    disabled={sendingMessage}
                  />
                  <div className="ticket-detail__reply-foot">
                    <span className="ticket-detail__reply-hint">
                      Press <kbd>⌘</kbd> + <kbd>Enter</kbd> to send
                    </span>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={sendingMessage || !message.trim()}
                    >
                      {sendingMessage ? <span className="spinner spinner-sm" /> : <Send size={16} />}
                      Send
                    </button>
                  </div>
                </form>
              ) : isResolved ? (
                <div className="ticket-detail__resolved-banner">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>This ticket is resolved.</strong>
                    {ticket.resolution && <p>{ticket.resolution}</p>}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="ticket-detail__aside">
            {/* AI Triage card */}
            <div className="card ticket-detail__triage">
              <div className="ticket-detail__triage-head">
                <span className="ticket-detail__triage-tag">
                  <Bot size={14} />
                  AI Triage
                </span>
                {ticket.aiReviewed ? (
                  <span className="ticket-detail__triage-status ticket-detail__triage-status--reviewed">
                    <CheckCircle2 size={14} />
                    Reviewed
                  </span>
                ) : (
                  <span className="ticket-detail__triage-status">Pending review</span>
                )}
              </div>

              {!editingTriage ? (
                <>
                  {ticket.aiSuggestion ? (
                    <div className="ticket-detail__triage-body">
                      <div className="ticket-detail__triage-row">
                        <span className="ticket-detail__triage-label">Category</span>
                        <CategoryBadge category={ticket.aiSuggestion.category} />
                      </div>
                      <div className="ticket-detail__triage-row">
                        <span className="ticket-detail__triage-label">Priority</span>
                        <PriorityBadge priority={ticket.aiSuggestion.priority} />
                      </div>
                      <div className="ticket-detail__triage-row">
                        <span className="ticket-detail__triage-label">Confidence</span>
                        <span className="ticket-detail__triage-confidence">
                          {Math.round((ticket.aiSuggestion.confidence || 0) * 100)}%
                        </span>
                      </div>
                      <div className="ticket-detail__triage-summary">
                        <span className="ticket-detail__triage-label">Summary</span>
                        <p>{ticket.aiSuggestion.summary}</p>
                      </div>
                      <div className="ticket-detail__triage-source">
                        Source: {ticket.aiSuggestion.source || 'rule-based'}
                      </div>
                    </div>
                  ) : (
                    <p className="ticket-detail__triage-empty">
                      No AI suggestion available. The agent will triage manually.
                    </p>
                  )}

                  {canAgentAct && !isResolved && (
                    <div className="ticket-detail__triage-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingTriage(true)}
                      >
                        <Edit3 size={14} />
                        {ticket.aiReviewed ? 'Edit' : 'Review & Save'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleRerunTriage}
                        title="Re-run AI analysis"
                      >
                        <RefreshCw size={14} />
                        Re-run
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="ticket-detail__triage-edit">
                  <div className="field">
                    <label className="field-label">Category</label>
                    <select
                      className="field-select"
                      value={triageForm.category}
                      onChange={(e) => setTriageForm((f) => ({ ...f, category: e.target.value }))}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Priority</label>
                    <select
                      className="field-select"
                      value={triageForm.priority}
                      onChange={(e) => setTriageForm((f) => ({ ...f, priority: e.target.value }))}
                    >
                      {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Summary</label>
                    <textarea
                      className="field-textarea"
                      value={triageForm.summary}
                      onChange={(e) => setTriageForm((f) => ({ ...f, summary: e.target.value }))}
                      rows={3}
                      maxLength={300}
                    />
                  </div>
                  <div className="ticket-detail__triage-edit-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingTriage(false);
                        setTriageForm({
                          category: ticket.aiSuggestion?.category || ticket.category,
                          priority: ticket.aiSuggestion?.priority || ticket.priority,
                          summary: ticket.aiSuggestion?.summary || '',
                        });
                      }}
                      disabled={savingTriage}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveTriage}
                      disabled={savingTriage}
                    >
                      {savingTriage ? <span className="spinner spinner-sm" /> : <Save size={14} />}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow / actions card */}
            {isStaff && (
              <div className="card ticket-detail__workflow">
                <h3 className="ticket-detail__section-title">Workflow</h3>

                <div className="ticket-detail__workflow-steps">
                  {STATUS_FLOW.map((s, i) => {
                    const currentIdx = STATUS_FLOW.indexOf(ticket.status);
                    const isPast = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div
                        key={s}
                        className={`ticket-detail__workflow-step ${
                          isPast ? 'is-past' : ''
                        } ${isCurrent ? 'is-current' : ''}`}
                      >
                        <span className="ticket-detail__workflow-step-dot" />
                        <span className="ticket-detail__workflow-step-label">
                          {STATUS_LABELS[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {!isResolved && canAgentAct && (
                  <div className="ticket-detail__workflow-actions">
                    {!ticket.assignedAgent && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-block btn-sm"
                        onClick={handleAssign}
                      >
                        Assign to me
                      </button>
                    )}
                    {next && (
                      <button
                        type="button"
                        className="btn btn-primary btn-block btn-sm"
                        onClick={() => handleStatusChange(next)}
                        disabled={changingStatus}
                      >
                        Move to {STATUS_LABELS[next]}
                      </button>
                    )}
                    {ticket.status !== 'resolved' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-block btn-sm"
                        onClick={() => setShowResolveModal(true)}
                        disabled={changingStatus}
                      >
                        <CheckCircle2 size={14} />
                        Resolve ticket
                      </button>
                    )}
                  </div>
                )}

                {isResolved && (
                  <div className="ticket-detail__resolution-note">
                    <CheckCircle2 size={16} />
                    <div>
                      <strong>Resolved</strong>
                      {ticket.resolution && <p>{ticket.resolution}</p>}
                      {ticket.resolvedAt && (
                        <span className="ticket-detail__resolution-date">
                          {formatDate(ticket.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Agent Helper (agents + admins only) */}
            {isStaff && (
              <AgentHelperPanel
                ticket={ticket}
                onUseSuggestion={(text) => {
                  if (text) {
                    setMessage(text);
                    messageInputRef.current?.focus();
                  }
                }}
              />
            )}

            {/* Customer info (staff only) */}
            {isStaff && ticket.customer && (
              <div className="card ticket-detail__customer-info">
                <h3 className="ticket-detail__section-title">Customer</h3>
                <div className="ticket-detail__customer-row">
                  <span
                    className="ticket-detail__customer-avatar"
                    style={{ background: ticket.customer.avatarColor || 'var(--color-primary)' }}
                  >
                    {initials(ticket.customer.name)}
                  </span>
                  <div>
                    <div className="ticket-detail__customer-name">{ticket.customer.name}</div>
                    <div className="ticket-detail__customer-email">{ticket.customer.email}</div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Resolve modal */}
        {showResolveModal && (
          <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__head">
                <h3>Resolve ticket</h3>
                <button
                  type="button"
                  className="modal__close"
                  onClick={() => setShowResolveModal(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal__body">
                <p className="modal__hint">
                  Add a resolution note. This will be visible to the customer and required
                  to mark the ticket as resolved.
                </p>
                <div className="field">
                  <div className="modal__label-row">
                    <label className="field-label">Resolution note</label>
                    <button
                      type="button"
                      className="modal__ai-btn"
                      onClick={async () => {
                        try {
                          setDraftingResolution(true);
                          const data = await api.tickets.draftResolution(ticket._id);
                          setResolution(data.draft);
                        } catch (err) {
                          setActionError(err.message || 'AI draft failed');
                        } finally {
                          setDraftingResolution(false);
                        }
                      }}
                      disabled={draftingResolution}
                    >
                      {draftingResolution ? <span className="spinner spinner-sm" /> : <Sparkles size={14} />}
                      Generate with AI
                    </button>
                  </div>
                  <textarea
                    className="field-textarea"
                    placeholder="e.g. Refund issued for the duplicate charge. Customer notified via email."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal__foot">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowResolveModal(false)}
                  disabled={changingStatus}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleResolve}
                  disabled={changingStatus || !resolution.trim()}
                >
                  {changingStatus ? <span className="spinner spinner-sm" /> : <CheckCircle2 size={16} />}
                  Resolve ticket
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MessageBubble({ message, currentUser }) {
  const isMe = message.sender === currentUser?._id || message.sender?._id === currentUser?._id;
  const isSystem = message.senderRole === 'system';
  const avatarColor = message.sender?.avatarColor || (
    message.senderRole === 'agent' ? 'var(--color-primary)' : 'var(--color-purple)'
  );

  if (isSystem) {
    return (
      <div className="message message--system">
        <span className="message__system-text">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`message ${isMe ? 'message--me' : ''} ${message.pending ? 'message--pending' : ''}`}>
      <span
        className="message__avatar"
        style={{ background: avatarColor }}
      >
        {initials(message.senderName)}
      </span>
      <div className="message__body">
        <div className="message__head">
          <span className="message__name">{isMe ? 'You' : message.senderName}</span>
          <span className="message__role">{message.senderRole}</span>
          <span className="message__time">{formatTime(message.createdAt)}</span>
        </div>
        <div className="message__content">{message.content}</div>
      </div>
    </div>
  );
}
