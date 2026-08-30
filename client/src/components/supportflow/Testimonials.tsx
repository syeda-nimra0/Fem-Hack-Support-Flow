

/**
 * Testimonials — quotes from the demo personas seeded in the app.
 * Avatar colors match the seeded avatarColor of each user.
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollFloat from "./ScrollFloat";
import { Quote, Star } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const QUOTES = [
  {
    quote:
      "I submitted a double-charge complaint at midnight and woke up to a reply. The AI had already flagged it as Billing / High, so Alex only had to confirm and refund. Fastest support loop I have used.",
    name: "Sarah Williams",
    role: "Customer · Retail",
    color: "#4E8D6E",
    ticket: "TKT-0001 · Resolved",
  },
  {
    quote:
      "The suggested category and priority land before I even open the ticket. I review, tweak if needed, approve — done. A triage step that used to eat my morning is now a single click.",
    name: "Alex Morgan",
    role: "Support Agent · Billing & Accounts",
    color: "#3368A0",
    ticket: "142 tickets handled",
  },
  {
    quote:
      "Everything on the dashboards is computed from real tickets, so the numbers actually mean something. I can see the category mix and resolution rate at a glance — no spreadsheets.",
    name: "Sam Sullivan",
    role: "Administrator · Support Lead",
    color: "#66A3BF",
    ticket: "Team of 2 agents",
  },
];

export default function Testimonials() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-testimonial]").forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            delay: (i % 3) * 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }
        );
      });
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    const timer = setTimeout(refresh, 600);
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, []);

  return (
    <section id="testimonials" className="border-y border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            From the people using it
          </span>
          <ScrollFloat
            as="h2"
            className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
            text="Both sides of the desk, happier"
          />
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            These are the demo accounts that ship with SupportFlow — their words
            reflect the exact workflow you will try in the live demo.
          </p>
        </div>

        <div ref={rootRef} className="mt-10 grid gap-5 md:grid-cols-3 sm:mt-12">
          {QUOTES.map((item) => (
            <figure
              key={item.name}
              data-testimonial
              className="flex min-w-0 flex-col rounded-3xl border border-border bg-background p-6 shadow-card"
            >
              <Quote size={22} className="text-primary" aria-hidden />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
                “{item.quote}”
              </blockquote>
              <div className="mt-5 flex gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="fill-primary text-primary" aria-hidden />
                ))}
              </div>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                >
                  {item.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.role}</span>
                </span>
                <span className="ml-auto max-w-[45%] shrink-0 truncate rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {item.ticket}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
