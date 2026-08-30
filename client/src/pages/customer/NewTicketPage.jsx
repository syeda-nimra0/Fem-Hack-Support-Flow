/**
 * NewTicketPage — customer creates a new ticket.
 * On submit, AI triage runs and the result is shown on the next page (ticket detail).
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Ticket as TicketIcon, Plus, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { api } from '../../lib/api';
import { CATEGORY_LABELS } from '../../lib/utils';
import './NewTicketPage.css';

export default function NewTicketPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (subject.trim().length < 5) {
      setError('Subject must be at least 5 characters.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.tickets.create({
        subject: subject.trim(),
        description: description.trim(),
        category: category || undefined,
      });
      navigate(`/app/ticket/${data.ticket._id}`, {
        state: { justCreated: true, triageError: data.triageError },
      });
    } catch (err) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const sidebarItems = [
    { to: '/app/customer', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/app/customer/tickets', label: 'My Tickets', icon: <TicketIcon size={18} /> },
    { to: '/app/customer/new', label: 'New Ticket', icon: <Plus size={18} /> },
  ];

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div className="new-ticket-page">
        <Link to="/app/customer/tickets" className="back-link">
          <ArrowLeft size={16} />
          Back to tickets
        </Link>

        <h1 className="page-title">Submit a new ticket</h1>
        <p className="page-subtitle">
          Tell us what's wrong. Our AI will analyze your request and suggest the right
          category and priority for the support team.
        </p>

        <div className="new-ticket-layout">
          <form onSubmit={handleSubmit} className="new-ticket-form card">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="field">
              <label className="field-label" htmlFor="subject">
                Subject <span className="field-required">*</span>
              </label>
              <input
                id="subject"
                type="text"
                className="field-input"
                placeholder="Brief summary of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
              />
              <span className="field-hint">{subject.length}/200 characters</span>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="description">
                Description <span className="field-required">*</span>
              </label>
              <textarea
                id="description"
                className="field-textarea"
                placeholder="Describe your issue in detail. Include any error messages, order numbers, or steps to reproduce."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10000}
                rows={8}
                required
              />
              <span className="field-hint">{description.length}/10000 characters</span>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="category">
                Category <span className="field-optional">(optional — AI will suggest one)</span>
              </label>
              <select
                id="category"
                className="field-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Let AI decide</option>
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="new-ticket-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/app/customer/tickets')}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !subject.trim() || !description.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Analyzing with AI…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Submit &amp; Triage
                  </>
                )}
              </button>
            </div>
          </form>

          <aside className="new-ticket-tips card">
            <h3 className="new-ticket-tips__title">Tips for a good ticket</h3>
            <ul>
              <li>
                <strong>Be specific.</strong> Include order numbers, error codes, or screenshots
                described in text.
              </li>
              <li>
                <strong>One issue per ticket.</strong> If you have multiple problems, submit
                separate tickets so each can be triaged correctly.
              </li>
              <li>
                <strong>Mention urgency.</strong> If it's blocking your work, say so —
                the AI uses keywords to set priority.
              </li>
              <li>
                <strong>Don't share sensitive data.</strong> Never include passwords, full card
                numbers, or personal identifiers.
              </li>
            </ul>

            <div className="new-ticket-tips__example">
              <span className="new-ticket-tips__example-tag">Example</span>
              <p>"I was charged twice for the same order and need one payment refunded."</p>
              <div className="new-ticket-tips__example-result">
                <span className="badge badge-category">Billing</span>
                <span className="badge badge-priority-high">HIGH</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
