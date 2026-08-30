/**
 * SlideArrowButton — button with an arrow that slides across on hover.
 * Adapted from Code 2.md (SlideArrowButton component).
 */
import { ArrowRight } from 'lucide-react';
import './SlideArrowButton.css';

export default function SlideArrowButton({
  text = 'Get Started',
  primaryColor = 'var(--color-primary)',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`slide-arrow-btn ${className}`}
      {...props}
    >
      <div
        className="slide-arrow-btn__overlay"
        style={{ backgroundColor: primaryColor }}
      >
        <span className="slide-arrow-btn__icon">
          <ArrowRight size={20} />
        </span>
      </div>
      <span className="slide-arrow-btn__label">{text}</span>
    </button>
  );
}
