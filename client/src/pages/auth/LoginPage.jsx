/**
 * LoginPage — email/password login with role hint.
 */
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/ui/Logo';
import './AuthPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (from && from.startsWith('/app')) {
        navigate(from, { replace: true });
      } else {
        const path = user.role === 'customer' ? '/app/customer'
          : user.role === 'agent' ? '/app/agent'
          : user.role === 'admin' ? '/app/admin'
          : '/app';
        navigate(path, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    setEmail(`${role}@supportflow.demo`);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <Link to="/" className="auth-page__logo">
          <Logo />
        </Link>

        <div className="auth-page__form-wrap">
          <h1 className="auth-page__title">Welcome back</h1>
          <p className="auth-page__subtitle">
            Sign in to your SupportFlow account to continue.
          </p>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <div className="field-input-wrap">
                <Mail size={16} />
                <input
                  id="email"
                  type="email"
                  className="field-input field-input--with-icon"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="field-input-wrap">
                <Lock size={16} />
                <input
                  id="password"
                  type="password"
                  className="field-input field-input--with-icon"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner spinner-sm" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-page__demo">
            <span className="auth-page__demo-label">Quick demo logins:</span>
            <div className="auth-page__demo-btns">
              <button type="button" className="demo-chip" onClick={() => fillDemo('customer')}>Customer</button>
              <button type="button" className="demo-chip" onClick={() => fillDemo('agent')}>Agent</button>
              <button type="button" className="demo-chip" onClick={() => fillDemo('admin')}>Admin</button>
            </div>
            <p className="auth-page__demo-hint">Password for all demo accounts: <code>password123</code></p>
          </div>

          <p className="auth-page__switch">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>

      <div className="auth-page__right">
        <div className="auth-page__panel">
          <div className="auth-page__panel-content">
            <h2>AI-assisted support, end to end.</h2>
            <p>
              Sign in to submit tickets, chat with agents in real time, and watch
              your issues move from New to Resolved — with AI triage at every step.
            </p>
            <ul>
              <li>Unique ticket numbers</li>
              <li>AI-suggested category, priority, summary</li>
              <li>Real-time chat with Socket.IO</li>
              <li>Live dashboard statistics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
