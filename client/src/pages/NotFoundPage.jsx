import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Logo from '../components/ui/Logo';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <Link to="/" className="not-found__logo">
        <Logo />
      </Link>

      <div className="not-found__content">
        <span className="not-found__code">404</span>
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn-primary">
            <Home size={16} />
            Back to home
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
