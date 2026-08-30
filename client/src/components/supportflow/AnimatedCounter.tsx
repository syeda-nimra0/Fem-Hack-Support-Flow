

/**
 * AnimatedCounter — number that eases up to its target using Anime.js v4.
 * Starts when scrolled into view and re-animates whenever the target changes
 * (e.g. live dashboard statistics arriving after first render).
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export default function AnimatedCounter({
  value,
  duration = 1400,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const visibleRef = useRef(false);
  const currentRef = useRef(0);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

  const format = (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`;

  const runAnimation = async (from: number, to: number) => {
    try {
      const { animate } = await import("animejs");
      if (!ref.current) return;
      const state = { n: from };
      animate(state, {
        n: to,
        duration,
        ease: "outExpo",
        onUpdate: () => {
          currentRef.current = state.n;
          if (ref.current) ref.current.textContent = format(state.n);
        },
        onComplete: () => {
          currentRef.current = to;
          if (ref.current) ref.current.textContent = format(to);
        },
      });
    } catch {
      // Animation library unavailable (e.g. chunk load hiccup) — set the value directly.
      currentRef.current = to;
      if (ref.current) ref.current.textContent = format(to);
    }
  };

  // Track visibility once
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          visibleRef.current = true;
          runAnimation(currentRef.current, latestValueRef.current);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Re-animate whenever the target changes (after first visibility)
  useEffect(() => {
    if (!visibleRef.current) return;
    if (Math.abs(currentRef.current - value) < 0.001) return;
    runAnimation(currentRef.current, value);
  }, [value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(0)}
    </span>
  );
}
