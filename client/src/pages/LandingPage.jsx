/**
 * LandingPage — public marketing page for SupportFlow.
 *
 * Tech used:
 *   - Three.js (@react-three/fiber + drei) for the hero particle network
 *   - GSAP + ScrollTrigger for scroll-driven animations
 *   - anime.js for tab indicator + stat counter
 *   - Lenis for smooth scrolling
 *   - ScrollFloat component (from code.md) for character reveal headings
 *   - GlareHover component (from code.md) for feature card hover effect
 *   - DonutChart component (from Code 2.md) for stat display
 *   - SlideArrowButton component (from Code 2.md) for CTAs
 *
 * Font: Poppins everywhere. No gradients. Professional dark theme.
 */
import { useEffect, useRef, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Zap, Shield, MessageSquare, BarChart3, Bot,
  CheckCircle2, Clock, Users, GitBranch, Sparkles,
} from 'lucide-react';

import PublicNav from '../components/layout/PublicNav';
import Footer from '../components/layout/Footer';
import ScrollFloat from '../components/anim/ScrollFloat';
import GlareHover from '../components/anim/GlareHover';
import DonutChart from '../components/anim/DonutChart';
import SlideArrowButton from '../components/anim/SlideArrowButton';

import { initLenis, destroyLenis, scrollToId } from '../lib/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HeroScene = lazy(() => import('../components/three/HeroScene'));

import './LandingPage.css';

const FEATURES = [
  {
    icon: <Bot size={22} />,
    title: 'AI Ticket Triage',
    description: 'Every new ticket is analyzed instantly. The AI suggests category, priority, and a concise summary — agents review before saving.',
  },
  {
    icon: <MessageSquare size={22} />,
    title: 'Real-Time Conversation',
    description: 'Socket.IO-powered chat between customers and agents. New messages, status changes, and typing indicators update without refresh.',
  },
  {
    icon: <Shield size={22} />,
    title: 'Role-Based Access',
    description: 'Customers see only their own tickets. Agents manage tickets assigned to them. Admins oversee the whole operation with live stats.',
  },
  {
    icon: <GitBranch size={22} />,
    title: 'Status Workflow',
    description: 'Clear ticket lifecycle: New → Assigned → In Progress → Resolved. Resolution requires a note — no silent closures.',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Live Dashboard',
    description: 'Real statistics from real ticket data. Resolution rate, average time, distribution by status, priority, and category.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Graceful Failover',
    description: 'If the AI service is unavailable, the rule-based fallback triages the ticket and the agent handles it manually. Nothing blocks the customer.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Customer submits a ticket',
    description: 'A customer logs in, fills out a short form with subject and description, and submits. A unique ticket number is generated instantly.',
  },
  {
    num: '02',
    title: 'AI analyzes and triages',
    description: 'The triage engine inspects the ticket text and produces a structured suggestion: category (billing, technical, shipping…), priority (low, medium, high), and a one-sentence summary.',
  },
  {
    num: '03',
    title: 'Agent reviews the suggestion',
    description: 'The assigned agent opens the ticket, sees the AI suggestion, and can accept it as-is or edit category, priority, and summary before saving.',
  },
  {
    num: '04',
    title: 'Conversation and resolution',
    description: 'Customer and agent exchange messages in real time. When the issue is solved, the agent adds a resolution note and marks the ticket Resolved. The dashboard updates instantly.',
  },
];

const STATS = [
  { value: 6, suffix: '', label: 'Ticket categories', color: 'var(--color-primary)' },
  { value: 4, suffix: '', label: 'Status stages', color: 'var(--color-purple)' },
  { value: 3, suffix: '', label: 'Priority levels', color: 'var(--color-warning)' },
  { value: 100, suffix: '%', label: 'AI-assisted', color: 'var(--color-success)' },
];

export default function LandingPage() {
  const heroRef = useRef(null);
  const heroTextRef = useRef(null);
  const featuresRef = useRef(null);
  const stepsRef = useRef(null);
  const statsRef = useRef(null);

  // Init Lenis smooth scrolling
  useEffect(() => {
    const lenis = initLenis();
    return () => destroyLenis();
  }, []);

  // Hero text entrance animation
  useEffect(() => {
    if (!heroTextRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.6 })
        .from('.hero-title-line', { y: 60, opacity: 0, duration: 0.9, stagger: 0.15 }, '-=0.3')
        .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
        .from('.hero-ctas > *', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
        .from('.hero-stats > *', { y: 20, opacity: 0, duration: 0.5, stagger: 0.08 }, '-=0.2');
    }, heroTextRef.current);
    return () => ctx.revert();
  }, []);

  // Animate stats counters when they scroll into view
  useEffect(() => {
    if (!statsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.stat-block').forEach((block) => {
        const target = Number(block.dataset.value || 0);
        const valueEl = block.querySelector('.stat-block__value');
        const counter = { v: 0 };
        ScrollTrigger.create({
          trigger: block,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.to(counter, {
              v: target,
              duration: 1.4,
              ease: 'power2.out',
              onUpdate: () => {
                valueEl.textContent = Math.floor(counter.v);
              },
              onComplete: () => {
                valueEl.textContent = target;
              },
            });
          },
        });
      });
    }, statsRef.current);
    return () => ctx.revert();
  }, []);

  // Stagger reveal feature cards
  useEffect(() => {
    if (!featuresRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.feature-card', {
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 80%',
        },
      });
    }, featuresRef.current);
    return () => ctx.revert();
  }, []);

  // Steps reveal
  useEffect(() => {
    if (!stepsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.step-row', {
        x: -30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.steps-list',
          start: 'top 75%',
        },
      });
      // Progress line draw
      gsap.fromTo('.steps-progress-line',
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.6,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: '.steps-list',
            start: 'top 70%',
            end: 'bottom 70%',
            scrub: true,
          },
        });
    }, stepsRef.current);
    return () => ctx.revert();
  }, []);

  // Refresh ScrollTrigger after lazy-loaded Three.js mounts
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="landing">
      <PublicNav />

      {/* ===== HERO ===== */}
      <section className="hero" ref={heroRef}>
        <div className="hero__bg">
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
          <div className="hero__bg-overlay" />
        </div>

        <div className="container hero__content" ref={heroTextRef}>
          <span className="hero-eyebrow eyebrow">
            <span className="eyebrow-dot" />
            AI-Powered Support Desk
          </span>

          <h1 className="hero-title">
            <span className="hero-title-line">Resolve tickets</span>
            <span className="hero-title-line">faster with</span>
            <span className="hero-title-line hero-title-line--accent">intelligent triage</span>
          </h1>

          <p className="hero-subtitle">
            SupportFlow analyzes every customer ticket the moment it's submitted —
            suggests the right category, priority, and a concise summary. Agents review,
            respond, and resolve in real time.
          </p>

          <div className="hero-ctas">
            <SlideArrowButton
              text="Get Started Free"
              onClick={() => scrollToId('how-it-works')}
            />
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign in
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat__value">SF-{`{nanoID}`}</span>
              <span className="hero-stat__label">Unique ticket numbers</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat__value">6 + 3 + 4</span>
              <span className="hero-stat__label">Categories · Priorities · Statuses</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat__value">Real-time</span>
              <span className="hero-stat__label">Socket.IO updates</span>
            </div>
          </div>
        </div>

        <div className="hero__scroll-hint">
          <span>Scroll to explore</span>
          <span className="hero__scroll-line" />
        </div>
      </section>

      {/* ===== STATS BLOCK ===== */}
      <section className="section section-tight" ref={statsRef} id="dashboard-preview">
        <div className="container">
          <div className="stats-grid">
            {STATS.map((s, i) => (
              <div
                key={i}
                className="stat-block card"
                data-value={s.value}
              >
                <DonutChart
                  size={88}
                  progress={(s.value / (s.suffix === '%' ? 100 : 6)) * 100}
                  progressColor={s.color}
                  progressWidth={6}
                  circleWidth={6}
                >
                  <span className="stat-block__value">0</span>
                </DonutChart>
                <span className="stat-block__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="section" id="features" ref={featuresRef}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Features
            </span>
            <ScrollFloat as="h2" containerClassName="section-title">
              Everything you need to run a support desk
            </ScrollFloat>
            <p className="section-subtitle">
              From AI triage to real-time chat, every piece of the workflow is built to be
              fast, observable, and forgiving when something goes wrong.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <GlareHover
                key={i}
                className="feature-card-wrapper"
                glareColor="#3b82f6"
                glareOpacity={0.15}
                glareSize={250}
                borderRadius="var(--radius-lg)"
              >
                <div className="feature-card">
                  <div className="feature-card__icon">{f.icon}</div>
                  <h3 className="feature-card__title">{f.title}</h3>
                  <p className="feature-card__desc">{f.description}</p>
                </div>
              </GlareHover>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section" id="how-it-works" ref={stepsRef}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              How it Works
            </span>
            <ScrollFloat as="h2" containerClassName="section-title">
              From submission to resolution
            </ScrollFloat>
            <p className="section-subtitle">
              A clear, four-step workflow. Every step has visible state and graceful fallbacks.
            </p>
          </div>

          <div className="steps-list">
            <div className="steps-progress">
              <div className="steps-progress-line" />
            </div>
            {STEPS.map((step, i) => (
              <div className="step-row" key={i}>
                <div className="step-row__num">{step.num}</div>
                <div className="step-row__body">
                  <h3 className="step-row__title">{step.title}</h3>
                  <p className="step-row__desc">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AI TRIAGE PREVIEW ===== */}
      <section className="section" id="ai-triage">
        <div className="container">
          <div className="ai-triage-grid">
            <div className="ai-triage-content">
              <span className="eyebrow">
                <span className="eyebrow-dot" />
                AI Triage
              </span>
              <ScrollFloat as="h2" containerClassName="section-title">
                Structured suggestions, every time
              </ScrollFloat>
              <p className="section-subtitle">
                The AI inspects the customer's complaint and returns a structured suggestion.
                The agent reviews it before anything is saved — full human-in-the-loop control.
              </p>

              <ul className="ai-triage-bullets">
                <li>
                  <CheckCircle2 size={18} />
                  <span>Category — billing, technical, shipping, account, product, general</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>Priority — low, medium, high (with confidence score)</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>Summary — one concise sentence describing the issue</span>
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  <span>Graceful fallback — rule-based triage if the LLM is unavailable</span>
                </li>
              </ul>

              <div className="ai-triage-cta">
                <SlideArrowButton
                  text="Try the demo"
                  primaryColor="var(--color-primary)"
                  onClick={() => window.location.href = '/register?role=customer'}
                />
              </div>
            </div>

            <div className="ai-triage-card">
              <div className="ai-triage-card__head">
                <span className="ai-triage-card__tag">Example</span>
                <span className="ai-triage-card__title">Customer complaint</span>
              </div>
              <p className="ai-triage-card__complaint">
                "I was charged twice for the same order and need one payment refunded."
              </p>

              <div className="ai-triage-card__divider" />

              <div className="ai-triage-card__result">
                <span className="ai-triage-card__result-tag">AI Suggestion</span>
                <div className="ai-triage-card__result-row">
                  <span className="ai-triage-card__result-label">Category</span>
                  <span className="badge badge-category">Billing</span>
                </div>
                <div className="ai-triage-card__result-row">
                  <span className="ai-triage-card__result-label">Priority</span>
                  <span className="badge badge-priority-high">HIGH</span>
                </div>
                <div className="ai-triage-card__result-row">
                  <span className="ai-triage-card__result-label">Summary</span>
                  <span className="ai-triage-card__result-summary">
                    Possible duplicate payment reported by customer.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STACK CTA ===== */}
      <section className="section">
        <div className="container">
          <div className="stack-cta">
            <div className="stack-cta__content">
              <ScrollFloat as="h2" containerClassName="stack-cta__title">
                Built on a reliable MERN stack
              </ScrollFloat>
              <p className="stack-cta__subtitle">
                React on the frontend, Express + Node.js on the backend, MongoDB Atlas for storage,
                Socket.IO for real-time, and an AI triage layer on top.
              </p>
              <div className="stack-cta__chips">
                {['React', 'Node.js', 'Express', 'MongoDB Atlas', 'Socket.IO', 'Three.js', 'GSAP', 'anime.js', 'Lenis'].map((s) => (
                  <span key={s} className="stack-cta__chip">{s}</span>
                ))}
              </div>
              <div className="stack-cta__actions">
                <Link to="/register" className="btn btn-primary btn-lg">
                  Create an account
                  <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  View demo
                </Link>
              </div>
              <p className="stack-cta__hint">
                Demo logins ready: <code>customer@supportflow.demo</code>,
                <code> agent@supportflow.demo</code>,
                <code> admin@supportflow.demo</code> — password <code>password123</code>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
