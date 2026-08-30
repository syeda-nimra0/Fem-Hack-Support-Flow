

/**
 * FAQ — accessible collapsible questions.
 * Height animation via the CSS grid-template-rows 0fr→1fr trick (no JS
 * measuring, buttery smooth, works with reduced-motion too).
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollFloat from "./ScrollFloat";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    q: "Is the AI triage automatic?",
    a: "AI runs on every new ticket and proposes a category, priority and summary, but nothing is applied until an agent reviews and approves it. That keeps the human in the loop — if Gemini is unavailable, a deterministic rules engine takes over so manual triage never blocks.",
  },
  {
    q: "Can I try it without creating an account?",
    a: "Yes. The login page ships with one-click demo buttons for a customer, two agents and an administrator. Sign in as the customer to raise a ticket, then switch to an agent account to triage, chat and resolve it.",
  },
  {
    q: "How does the realtime part work?",
    a: "Locally, Socket.IO pushes new messages, ticket updates and typing indicators the instant they happen. On serverless hosting the app automatically switches to a sync mode (a few seconds of polling) — the interface stays live either way, and the status chip in the header always tells you which mode you are in.",
  },
  {
    q: "Where is my data stored?",
    a: "In MongoDB Atlas. Accounts are stored with bcrypt-hashed passwords, sessions use signed JWTs, and customers can only ever query their own tickets — the rules are enforced on the server, not in the browser.",
  },
  {
    q: "Can a ticket be closed without a resolution note?",
    a: "No. The workflow enforces New → Assigned → In Progress → Resolved, and the final transition requires a resolution note. AI drafts one for the agent to edit and approve; once resolved, the ticket locks and reopening needs a reason.",
  },
  {
    q: "What happens if the AI API fails?",
    a: "The request falls back through a chain: Gemini → GLM → deterministic keyword rules. Whatever answers first gets validated before it is stored, and the ticket is always created — worst case it is simply triaged manually by an agent.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number>(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-faq-item]",
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.07,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 82%", once: true },
        }
      );
    }, root);
    const timer = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, []);

  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Questions, answered
        </span>
        <ScrollFloat
          as="h2"
          className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          text="Frequently asked questions"
        />
      </div>

      <div ref={rootRef} className="mt-10 flex flex-col gap-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              data-faq-item
              className={cn(
                "rounded-2xl border bg-card transition-colors",
                isOpen ? "border-primary/40 shadow-card" : "border-border"
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold sm:text-base">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={cn(
                    "shrink-0 text-primary transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
