

/**
 * LandingNav — fixed top navigation with a GSAP "pill" hover effect.
 * Adapted from upload/code.md (react-bits PillNav): a circular fill scales up
 * behind each label on hover while the label rolls over. Includes the
 * SupportFlow logo, theme toggle and auth-aware CTA.
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Menu, Moon, Sun, X } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "@/lib/theme";
import { useApp } from "@/lib/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  target: string; // element id on the landing page
}

const NAV_ITEMS: NavItem[] = [
  { label: "Features", target: "features" },
  { label: "How it works", target: "how-it-works" },
  { label: "AI Triage", target: "ai-triage" },
  { label: "Live demo", target: "demo" },
];

function scrollToSection(target: string) {
  const el = document.getElementById(target);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground",
        "transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun size={17} />
        ) : (
          <Moon size={17} />
        )
      ) : (
        <Moon size={17} />
      )}
    </button>
  );
}

export default function Navbar() {
  const { user, navigate } = useApp();
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timelineRefs = useRef<gsap.core.Timeline[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Build the hover timeline for each pill
  useEffect(() => {
    circleRefs.current.forEach((circle, index) => {
      if (!circle?.parentElement) return;
      const pill = circle.parentElement;
      const rect = pill.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const R = (w * w) / 8 + (h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 2;
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;

      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${D - delta}px` });

      const label = pill.querySelector(".pn-label");
      const hoverLabel = pill.querySelector(".pn-label-hover");
      if (label) gsap.set(label, { y: 0 });
      if (hoverLabel) gsap.set(hoverLabel, { y: Math.ceil(h + 10), opacity: 0 });

      timelineRefs.current[index]?.kill();
      const tl = gsap.timeline({ paused: true });
      tl.to(circle, { scale: 1.35, xPercent: -50, duration: 0.55, ease: "power3.out" }, 0);
      if (label) tl.to(label, { y: -(h + 6), duration: 0.55, ease: "power3.out" }, 0);
      if (hoverLabel) tl.to(hoverLabel, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" }, 0);
      timelineRefs.current[index] = tl;
    });
    return () => {
      timelineRefs.current.forEach((tl) => tl.kill());
      timelineRefs.current = [];
    };
  }, []);

  const handleEnter = (i: number) => timelineRefs.current[i]?.tweenTo(timelineRefs.current[i].duration(), { duration: 0.28, ease: "power2.out" });
  const handleLeave = (i: number) => timelineRefs.current[i]?.tweenTo(0, { duration: 0.32, ease: "power2.out" });

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/90 shadow-card backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2.5"
          aria-label="SupportFlow home"
        >
          <Logo className="h-9" />
        </button>

        <div className="hidden items-center gap-1 lg:flex" role="menubar">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.target}
              type="button"
              role="menuitem"
              className="group relative overflow-hidden rounded-full px-4 py-2 text-sm font-medium text-foreground"
              onMouseEnter={() => handleEnter(i)}
              onMouseLeave={() => handleLeave(i)}
              onClick={() => scrollToSection(item.target)}
            >
              <span
                ref={(el) => {
                  circleRefs.current[i] = el;
                }}
                className="pointer-events-none absolute left-1/2 rounded-full bg-primary"
                aria-hidden
              />
              <span className="relative block overflow-hidden" style={{ height: 20 }}>
                <span className="pn-label block text-foreground">{item.label}</span>
                <span className="pn-label-hover absolute left-0 top-full block text-primary-foreground" aria-hidden>
                  {item.label}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  user.role === "customer"
                    ? { name: "customer" }
                    : user.role === "agent"
                      ? { name: "agent" }
                      : { name: "admin" }
                )
              }
              className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:inline-flex"
            >
              Open dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate({ name: "login" })}
                className="hidden rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => navigate({ name: "register" })}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Get started
              </button>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 pt-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.target}
              type="button"
              className="block w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-accent"
              onClick={() => {
                setMobileOpen(false);
                scrollToSection(item.target);
              }}
            >
              {item.label}
            </button>
          ))}
          {!user && (
            <button
              type="button"
              className="mt-2 block w-full rounded-lg bg-primary px-3 py-3 text-center text-sm font-semibold text-primary-foreground"
              onClick={() => {
                setMobileOpen(false);
                navigate({ name: "login" });
              }}
            >
              Sign in
            </button>
          )}
        </div>
      )}
    </header>
  );
}
