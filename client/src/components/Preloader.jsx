/**
 * Preloader — full-screen loading animation shown on initial page load.
 *
 * Waits for:
 *   - Poppins font to load (document.fonts.ready)
 *   - Minimum display time (1.4s) so it doesn't flash
 * Then fades out smoothly.
 *
 * Shows the SupportFlow logo with an animated ring + pulse.
 */
import { useEffect, useState } from 'react';
import './Preloader.css';

export default function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const MIN_DISPLAY = 1400;
    const start = Date.now();

    async function wait() {
      try {
        // Wait for fonts to be ready
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch {
        // Ignore font loading errors
      }

      // Ensure minimum display time
      const elapsed = Date.now() - start;
      const remaining = Math.max(MIN_DISPLAY - elapsed, 0);

      setTimeout(() => {
        if (!mounted) return;
        setFading(true);
        // Remove from DOM after fade transition
        setTimeout(() => {
          if (mounted) setVisible(false);
        }, 500);
      }, remaining);
    }

    wait();

    return () => {
      mounted = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`preloader ${fading ? 'preloader--fading' : ''}`}>
      <div className="preloader__inner">
        <div className="preloader__logo">
          <svg viewBox="0 0 64 64" width="56" height="56">
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
        </div>

        <div className="preloader__ring">
          <div className="preloader__ring-spin" />
        </div>

        <div className="preloader__text">
          <span className="preloader__brand">
            Support<span className="preloader__brand-accent">Flow</span>
          </span>
          <span className="preloader__tagline">AI-Powered Support Desk</span>
        </div>

        <div className="preloader__bar">
          <div className="preloader__bar-fill" />
        </div>
      </div>
    </div>
  );
}
