/**
 * TicketCard — compact card representation of a ticket for list views.
 */
import { Link } from 'react-router-dom';
import { Clock, MessageSquare, User } from 'lucide-react';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../ui/StatusBadge';
import { timeAgo, initials } from '../../lib/utils';
import './TicketCard.css';

export default function TicketCard({ ticket, to, showCustomer = false }) {
  const link = to || `/app/ticket/${ticket._id}`;
  const messageCount = (ticket.messages?.length || 0);
  const lastMessage = ticket.messages?.[ticket.messages?.length - 1];

  return (
    <Link to={link} className="ticket-card card card-hover">
      <div className="ticket-card__head">
        <span className="ticket-card__number">{ticket.ticketNumber}</span>
        <div className="ticket-card__badges">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <h3 className="ticket-card__subject">{ticket.subject}</h3>

      {ticket.aiSuggestion?.summary && (
        <p className="ticket-card__summary">
          <span className="ticket-card__summary-tag">AI</span>
          {ticket.aiSuggestion.summary}
        </p>
      )}

      <div className="ticket-card__meta">
        <CategoryBadge category={ticket.category} />
        <span className="ticket-card__meta-item">
          <MessageSquare size={13} />
          {messageCount}
        </span>
        <span className="ticket-card__meta-item">
          <Clock size={13} />
          {timeAgo(ticket.updatedAt || ticket.createdAt)}
        </span>
        {showCustomer && ticket.customerName && (
          <span className="ticket-card__meta-item ticket-card__customer">
            <span
              className="ticket-card__customer-avatar"
              style={{
                background:
                  ticket.customer?.avatarColor ||
                  'var(--color-primary)',
              }}
            >
              {initials(ticket.customerName)}
            </span>
            {ticket.customerName}
          </span>
        )}
      </div>
    </Link>
  );
}
