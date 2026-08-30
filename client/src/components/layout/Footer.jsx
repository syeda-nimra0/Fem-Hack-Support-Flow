/**
 * Footer — site-wide footer for the landing page.
 */
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo />
          <p className="footer__tagline">
            AI-assisted customer support desk. From ticket submission to resolution,
            powered by intelligent triage.
          </p>
        </div>

        <div className="footer__columns">
          <div className="footer__col">
            <h4>Product</h4>
            <Link to="/register">Get Started</Link>
            <Link to="/login">Sign In</Link>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
          </div>
          <div className="footer__col">
            <h4>Roles</h4>
            <Link to="/register?role=customer">For Customers</Link>
            <Link to="/register?role=agent">For Agents</Link>
            <a href="#dashboard-preview">Dashboard</a>
          </div>
          <div className="footer__col">
            <h4>Stack</h4>
            <span>React</span>
            <span>Node.js</span>
            <span>Express</span>
            <span>MongoDB Atlas</span>
            <span>Socket.IO</span>
          </div>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} SupportFlow. Built for the SMIT Hackathon.</span>
        <span className="footer__stack">MERN · Socket.IO · Three.js · GSAP</span>
      </div>
    </footer>
  );
}
