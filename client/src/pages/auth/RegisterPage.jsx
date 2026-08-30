/**
 * RegisterPage — sign up with role selection (customer or agent).
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/ui/Logo';
import './AuthPage.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const initialRole = params.get('role') === 'agent' ? 'agent' : 'customer';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const user = await register({ name, email, password, role });
      const path = user.role === 'customer' ? '/app/customer'
        : user.role === 'agent' ? '/app/agent'
        : '/app';
      navigate(path, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <Link to="/" className="auth-page__logo">
          <Logo />
        </Link>

        <div className="auth-page__form-wrap">
          <h1 className="auth-page__title">Create your account</h1>
          <p className="auth-page__subtitle">
            Join SupportFlow as a customer or support agent.
          </p>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="role-picker">
            <button
              type="button"
              className={`role-card ${role === 'customer' ? 'is-selected' : ''}`}
              onClick={() => setRole('customer')}
            >
              <div className="role-card__head">
                <span className="role-card__icon">
                  <User size={18} />
                </span>
                <span className="role-card__title">Customer</span>
                {role === 'customer' && <CheckCircle2 size={16} className="role-card__check" />}
              </div>
              <p>Submit tickets, chat with agents, track status.</p>
            </button>

            <button
              type="button"
              className={`role-card ${role === 'agent' ? 'is-selected' : ''}`}
              onClick={() => setRole('agent')}
            >
              <div className="role-card__head">
                <span className="role-card__icon">
                  <CheckCircle2 size={18} />
                </span>
                <span className="role-card__title">Support Agent</span>
                {role === 'agent' && <CheckCircle2 size={16} className="role-card__check" />}
              </div>
              <p>Review AI triage, respond to customers, resolve tickets.</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label className="field-label" htmlFor="name">Full name</label>
              <div className="field-input-wrap">
                <User size={16} />
                <input
                  id="name"
                  type="text"
                  className="field-input field-input--with-icon"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
            </div>

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
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="auth-page__switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="auth-page__right">
        <div className="auth-page__panel">
          <div className="auth-page__panel-content">
            <h2>Get started in seconds.</h2>
            <p>
              Pick a role, sign up, and you're in. No credit card, no setup.
              The dashboard is ready to use with demo data already seeded.
            </p>
            <ul>
              <li>Customer: submit tickets and watch them get triaged</li>
              <li>Agent: review AI suggestions and resolve tickets</li>
              <li>Real-time updates across all your devices</li>
              <li>Built on the MERN stack with Socket.IO</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
