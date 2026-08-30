/**
 * StatusBadge — colored badge for ticket status.
 */
import { STATUS_LABELS } from '../../lib/utils';
import './StatusBadge.css';

export function StatusBadge({ status, className = '' }) {
  return (
    <span className={`badge badge-status-${status} ${className}`}>
      <span className="status-badge__dot" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority, className = '' }) {
  return (
    <span className={`badge badge-priority-${priority} ${className}`}>
      {priority?.toUpperCase()}
    </span>
  );
}

export function CategoryBadge({ category, className = '' }) {
  const labels = {
    billing: 'Billing',
    technical: 'Technical',
    shipping: 'Shipping',
    account: 'Account',
    product: 'Product',
    general: 'General',
  };
  return (
    <span className={`badge badge-category ${className}`}>
      {labels[category] || category}
    </span>
  );
}
