

/**
 * ProductTour — step-by-step product walkthrough with real screenshots.
 * Four zigzag rows (browser-chrome image card + step copy), revealed with
 * GSAP ScrollTrigger. Screenshots live in client/public/tour/.
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollFloat from "./ScrollFloat";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    step: "01",
    tag: "SIGN UP",
    url: "supportflow.io/register",
    image: "/tour/tour-signup.webp",
    alt: "SupportFlow sign-up page",
    title: "Create your account in seconds",
    description:
      "Register as a customer with just a name, email and password — or jump straight in with a one-click demo login. Roles are separated from the very first screen, so customers, agents and admins each land in their own workspace.",
    points: ["One-click demo accounts", "JWT-protected sessions", "Customer, agent & admin roles"],
  },
  {
    step: "02",
    tag: "DASHBOARD",
    url: "supportflow.io/dashboard",
    image: "/tour/tour-dashboard.webp",
    alt: "Customer dashboard with ticket list",
    title: "Every ticket, one clean dashboard",
    description:
      "The dashboard gathers all of your conversations in one place — live status chips, priorities, categories and an AI-assisted chat widget that follows you across the app. Statistics update the moment anything changes.",
    points: ["Live status per ticket", "Flow AI chat assistant", "Real-time statistics"],
  },
  {
    step: "03",
    tag: "NEW TICKET",
    url: "supportflow.io/dashboard",
    image: "/tour/tour-newticket.webp",
    alt: "New ticket dialog with AI triage",
    title: "Raise a ticket — AI triages it instantly",
    description:
      "Describe the problem in plain words. As soon as you hit submit, Gemini reads the complaint and proposes a category, a priority and a concise summary. You see the suggestion right away; an agent confirms it before it counts.",
    points: ["Subject + description form", "Gemini suggests category & priority", "Every ticket gets a TKT number"],
  },
  {
    step: "04",
    tag: "TICKET THREAD",
    url: "supportflow.io/tickets",
    image: "/tour/tour-ticket.webp",
    alt: "Ticket conversation page with agent replies",
    title: "Chat with your agent until it's resolved",
    description:
      "The ticket thread keeps the whole conversation in one timeline — your messages, the agent's replies, status changes and the final resolution note. Everything arrives live; no refresh, no waiting, full history saved.",
    points: ["Real-time conversation", "Status timeline & history", "Mandatory resolution note"],
  },
];

export default function ProductTour() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-tour-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 44 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 86%", once: true },
          }
        );
      });

      // Screenshot parallax peek: image slides slightly inside its frame
      gsap.utils.toArray<HTMLElement>("[data-tour-img]").forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -3.5 },
          {
            yPercent: 3.5,
            ease: "none",
            scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: 0.6 },
          }
        );
      });
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    const timer = setTimeout(refresh, 700);
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, []);

  return (
    <section id="product-tour" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Product tour
        </span>
        <ScrollFloat
          as="h2"
          className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          text="See a ticket come to life"
        />
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Four real screens, one journey — from the moment a customer signs up to the
          moment their ticket is resolved. No mockups; this is the actual app.
        </p>
      </div>

      <div ref={rootRef} className="mt-12 flex flex-col gap-14 sm:mt-14 sm:gap-20">
        {STEPS.map((item, i) => {
          const flip = i % 2 === 1;
          return (
            <div
              key={item.step}
              className={cn(
                "grid items-center gap-7 sm:gap-10 lg:grid-cols-2",
                flip && "lg:[&>*:first-child]:order-2"
              )}
            >
              {/* --- Browser-chrome screenshot card --- */}
              <div data-tour-reveal className="group relative">
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow duration-300 hover:shadow-elev">
                  {/* Chrome header */}
                  <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-2.5">
                    <span className="flex gap-1.5" aria-hidden>
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--priority-high)]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--priority-medium)]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--priority-low)]" />
                    </span>
                    <span className="mx-auto truncate rounded-full border border-border bg-background px-4 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {item.url}
                    </span>
                    <span className="w-10 shrink-0" aria-hidden />
                  </div>
                  {/* Screenshot with parallax */}
                  <div className="overflow-hidden">
                    <img
                      data-tour-img
                      src={item.image}
                      alt={item.alt}
                      width={1280}
                      height={604}
                      loading="lazy"
                      decoding="async"
                      className="block h-auto w-full scale-[1.07] object-cover"
                    />
                  </div>
                </div>

                {/* Floating step badge */}
                <span className="absolute -left-3 -top-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-card sm:-left-5 sm:-top-5 sm:h-12 sm:w-12">
                  {item.step}
                </span>
              </div>

              {/* --- Copy --- */}
              <div data-tour-reveal className={cn(flip && "lg:pr-6")}>
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-accent px-3 py-1 text-[11px] font-bold tracking-[0.15em] text-primary">
                  {item.tag}
                </span>
                <h3 className="font-display mt-3.5 text-2xl font-bold tracking-tight sm:text-3xl">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {item.description}
                </p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-center gap-2.5 text-sm">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
