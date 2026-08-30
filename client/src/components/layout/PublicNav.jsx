/**
 * PublicNav — top navigation for the landing page.
 * Glass effect on scroll, sticky.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { scrollToId } from '../../lib/lenis';
import './PublicNav.css';

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How it Works', id: 'how-it-works' },
    { label: 'AI Triage', id: 'ai-triage' },
    { label: 'Dashboard', id: 'dashboard-preview' },
  ];

  const handleNav = (id) => {
    setMobileOpen(false);
    scrollToId(id);
  };

  const dashboardPath = user?.role === 'customer' ? '/app/customer'
    : user?.role === 'agent' ? '/app/agent'
    : user?.role === 'admin' ? '/app/admin'
    : '/app';

  return (
    <header className={`public-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container public-nav__inner">
        <Logo />

        <nav className="public-nav__links">
          {navLinks.map((l) => (
            <button
              key={l.id}
              type="button"
              className="public-nav__link"
              onClick={() => handleNav(l.id)}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="public-nav__actions">
          {isAuthenticated ? (
            <Link to={dashboardPath} className="btn btn-primary btn-sm">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="public-nav__burger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="public-nav__mobile">
          {navLinks.map((l) => (
            <button
              key={l.id}
              type="button"
              className="public-nav__mobile-link"
              onClick={() => handleNav(l.id)}
            >
              {l.label}
            </button>
          ))}
          <div className="public-nav__mobile-actions">
            {isAuthenticated ? (
              <Link to={dashboardPath} className="btn btn-primary btn-block">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary btn-block">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary btn-block">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
