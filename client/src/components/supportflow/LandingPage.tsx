

/**
 * LandingPage — marketing site for SupportFlow.
 * Animation stack: Lenis (smooth scroll) + GSAP ScrollTrigger (reveals,
 * ScrollFloat, ScrollStack) + Three.js (hero particle network) + Anime.js
 * (animated counters). Solid brand colors only — no gradients.
 */
import { useEffect, useRef } from "react";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  MessageSquareText,
  BarChart3,
  Bot,
  ClipboardCheck,
  ArrowRight,
  Ticket,
  UserRoundCheck,
  CircleCheckBig,
  Radio,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ThreeBackground from "./ThreeBackground";
import ScrollFloat from "./ScrollFloat";
import ScrollVelocity from "./ScrollVelocity";
import CircularText from "./CircularText";
import SwapText from "./SwapText";
import MagicBento from "./MagicBento";
import ScrollStack from "./ScrollStack";
import SlideArrowButton from "./SlideArrowButton";
import AnimatedCounter from "./AnimatedCounter";
import TriageDemo from "./TriageDemo";
import ProductTour from "./ProductTour";
import Testimonials from "./Testimonials";
import FAQ from "./FAQ";
import { useApp } from "@/lib/store";

const FEATURES = [
  {
    id: "ai-triage",
    title: "AI ticket triage with human review",
    description:
      "Gemini suggests category, priority and a concise summary for every ticket. Agents review and edit each suggestion before it is applied — AI assists, humans decide.",
    icon: <Sparkles />,
    large: true,
  },
  {
    id: "workflow",
    title: "Status workflow",
    description: "New → Assigned → In Progress → Resolved, with enforced transitions and resolution notes.",
    icon: <ClipboardCheck />,
  },
  {
    id: "realtime",
    title: "Real-time everything",
    description: "Socket.IO pushes new messages and status changes instantly — no refresh, with typing indicators.",
    icon: <Radio />,
  },
  {
    id: "auth",
    title: "Protected role areas",
    description: "JWT authentication with separate customer, agent and administrator experiences.",
    icon: <ShieldCheck />,
  },
  {
    id: "stats",
    title: "Live dashboards",
    description: "Statistics computed from real ticket data: resolution rate, SLA times and category mix.",
    icon: <BarChart3 />,
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Customer submits a ticket",
    description:
      "A clear form with subject, description and an optional category. Every ticket receives a unique number (TKT-0001) and lands in the queue instantly.",
    icon: <Ticket />,
  },
  {
    step: "02",
    title: "AI triages in seconds",
    description:
      "Gemini reads the complaint and proposes a category, priority and short summary — for example Billing / High — plus a draft first reply. The suggestion is validated before storage.",
    icon: <Bot />,
  },
  {
    step: "03",
    title: "Agent reviews and takes over",
    description:
      "The agent opens the ticket, edits or approves the AI suggestion with one click, and the ticket is assigned to them. They can chat with the customer in real time.",
    icon: <UserRoundCheck />,
  },
  {
    step: "04",
    title: "Resolve with a note",
    description:
      "A ticket can only be resolved with a resolution note. AI drafts a resolution summary, the agent reviews it, and the customer sees everything live.",
    icon: <CircleCheckBig />,
  },
];

export default function LandingPage() {
  const { user, navigate } = useApp();
  const lenisRef = useRef<unknown>(null);

  // Lenis smooth scrolling + GSAP ScrollTrigger integration
  useEffect(() => {
    let raf = 0;
    let lenisInstance: { raf: (time: number) => void; destroy: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.6 });
      lenisRef.current = lenis;
      lenisInstance = lenis as unknown as { raf: (time: number) => void; destroy: () => void };

      lenis.on("scroll", ScrollTrigger.update);
      const loop = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenisInstance?.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden pb-16 pt-28 sm:pt-36">
        <ThreeBackground className="pointer-events-none absolute inset-0 h-full w-full opacity-90" />
        <div className="sf-dotgrid pointer-events-none absolute inset-0 opacity-60" aria-hidden />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary shadow-card">
              <Sparkles size={13} />
              AI-ASSISTED CUSTOMER SUPPORT DESK
            </span>

            <h1 className="font-display mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Support tickets that
              <br />
              <span className="text-primary">triage themselves</span>
              <br />
              before your team wakes up.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              SupportFlow pairs a focused ticketing workflow with Google Gemini. Customers get
              instant acknowledgement, agents get AI-suggested categories, priorities and draft
              replies — and everyone watches updates land in real time.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <SlideArrowButton
                text={user ? "Open your dashboard" : "Try the live demo"}
                onClick={() =>
                  user
                    ? navigate(
                        user.role === "customer"
                          ? { name: "customer" }
                          : user.role === "agent"
                            ? { name: "agent" }
                            : { name: "admin" }
                      )
                    : navigate({ name: "login" })
                }
              />
              <button
                type="button"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 rounded-full px-2 py-3 text-sm font-semibold text-foreground hover:text-primary"
              >
                See how it works
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Landing stats — animated with Anime.js */}
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-5">
              {[
                { label: "Faster first reply", value: 62, suffix: "%" },
                { label: "Auto-triaged tickets", value: 100, suffix: "%" },
                { label: "Real-time updates", value: 24, suffix: "/7" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-3xl font-bold text-primary sm:text-4xl">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </dt>
                  <dd className="mt-1 text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero side card + rotating badge */}
          <div className="relative mx-auto hidden w-full max-w-sm lg:block">
            <div className="relative rounded-3xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="sf-status-chip sf-status-new">
                  <span className="sf-dot" />
                  New · TKT-0042
                </span>
                <span className="text-xs font-medium text-muted-foreground">just now</span>
              </div>
              <h3 className="mt-3.5 text-base font-semibold leading-snug">
                “I was charged twice for the same order and need one payment refunded.”
              </h3>
              <div className="mt-4 rounded-xl border border-border bg-muted p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Sparkles size={13} /> AI suggestion — pending review
                </p>
                <ul className="mt-2.5 flex flex-col gap-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-semibold">Billing</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Priority</span>
                    <span className="font-semibold text-[var(--priority-high)]">High</span>
                  </li>
                  <li className="flex items-start justify-between gap-4">
                    <span className="shrink-0 text-muted-foreground">Summary</span>
                    <span className="text-right font-medium">
                      Possible duplicate payment reported by customer.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="sf-typing-dot" />
                <span className="sf-typing-dot" />
                <span className="sf-typing-dot" />
                Agent Alex is reviewing…
              </div>
            </div>
            <CircularText
              text="AI TRIAGE • HUMAN REVIEW • REALTIME • "
              className="absolute -bottom-10 -right-10 h-28 w-28 text-primary"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Marquee band */}
      <div className="border-y border-border bg-card py-5">
        <ScrollVelocity
          texts={["AI TRIAGE", "HUMAN REVIEW", "REALTIME UPDATES", "SMART WORKFLOW"]}
          velocity={45}
          className="text-2xl text-primary sm:text-4xl"
          rowClassName="py-1"
        />
      </div>

      {/* ------------------------------------------------------------ Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Everything a support desk needs
          </span>
          <ScrollFloat
            as="h2"
            className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
            text="A focused MVP, engineered end-to-end"
          />
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Every feature maps to the ticket lifecycle — from the first customer message to the
            resolution note — with the AI layer woven in where it genuinely helps.
          </p>
        </div>

        <div className="mt-10">
          <MagicBento items={FEATURES} />
        </div>
      </section>

      {/* --------------------------------------------------------- How it works */}
      <section id="how-it-works" className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              The SupportFlow loop
            </span>
            <ScrollFloat
              as="h2"
              className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
              text="From complaint to resolution"
            />
          </div>

          <ScrollStack
            className="mx-auto mt-10 max-w-3xl"
            cards={WORKFLOW_STEPS.map((item) => (
              <div key={item.step} className="flex gap-5 p-6 sm:p-8">
                <div className="flex flex-col items-center gap-2.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground [&_svg]:h-5 [&_svg]:w-5">
                    {item.icon}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold sm:text-xl">{item.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          />
        </div>
      </section>

      {/* ------------------------------------------------- Product tour (screenshots) */}
      <ProductTour />

      {/* ------------------------------------------------------------ AI triage */}
      <section id="ai-triage" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Powered by Google Gemini
          </span>
          <ScrollFloat
            as="h2"
            className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
            text="Try the AI triage yourself"
          />
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            This is the same engine that runs on every submitted ticket. Type a complaint and watch
            it get classified — then imagine an agent confirming it with one click.
          </p>
        </div>
        <div className="mt-10" id="demo">
          <TriageDemo />
        </div>
      </section>

      {/* --------------------------------------------------------- Why section */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2">
          <div>
            <ScrollFloat
              as="h2"
              className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
              text="Built for real support teams"
            />
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              SupportFlow is intentionally focused: one workflow, done properly. Business rules are
              enforced on the server, AI output is validated before storage, and the interface stays
              fast and responsive on any device.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "Resolved tickets lock automatically — reopening requires a reason",
                "A resolution note is mandatory before closing any ticket",
                "Customers only ever see their own conversations",
                "AI failures degrade gracefully — manual triage always works",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CircleCheckBig size={17} className="mt-0.5 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Zap />, title: "Instant triage", text: "Category, priority & summary in one pass." },
              { icon: <MessageSquareText />, title: "Persistent history", text: "Every conversation is stored and replayable." },
              { icon: <ShieldCheck />, title: "Keys stay server-side", text: "The Gemini API key never reaches the browser." },
              { icon: <BarChart3 />, title: "Honest analytics", text: "All statistics computed from live ticket data." },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-border bg-background p-5 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:h-5 [&_svg]:w-5">
                  {card.icon}
                </span>
                <h3 className="mt-3.5 text-sm font-semibold">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Testimonials */}
      <Testimonials />

      {/* ------------------------------------------------------------------ FAQ */}
      <FAQ />

      {/* ------------------------------------------------------------------ CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card sm:p-12">
          <h2 className="font-display mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            <SwapText
              initialText="Ready to resolve faster?"
              finalText="Sign in to the live demo."
              className="mx-auto inline-block text-3xl font-bold sm:text-4xl"
            />
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Use the demo accounts to explore both sides of the desk — submit a ticket as a customer,
            then triage and resolve it as an agent.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <SlideArrowButton text="Sign in to the demo" onClick={() => navigate({ name: "login" })} />
            <button
              type="button"
              onClick={() => navigate({ name: "register" })}
              className="rounded-full border border-border px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Create a customer account
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
