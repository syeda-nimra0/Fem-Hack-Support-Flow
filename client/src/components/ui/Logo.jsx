/**
 * Logo — SupportFlow brand mark + wordmark.
 */
import { Link } from 'react-router-dom';
import './Logo.css';

export default function Logo({ to = '/', compact = false, className = '' }) {
  const content = (
    <span className={`logo ${className}`}>
      <span className="logo__mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="32" height="32">
          <path
            d="M32 8 L52 18 V32 C52 44 44 52 32 56 C20 52 12 44 12 32 V18 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="30" r="5" fill="currentColor" />
          <path
            d="M26 38 Q32 42 38 38"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="logo__text">
          Support<span className="logo__text-accent">Flow</span>
        </span>
      )}
    </span>
  );

  if (to) {
    return <Link to={to} className="logo-link">{content}</Link>;
  }
  return content;
}
