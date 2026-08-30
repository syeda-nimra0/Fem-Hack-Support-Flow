

/**
 * ScrollStack — cards stack on top of each other while scrolling.
 *
 * Implementation note (v2): the original GSAP `pin` + `pinSpacing:false`
 * approach glitches with Lenis smooth-scroll (cards jump/snap when the pinned
 * element releases). This version uses native CSS `position: sticky` for the
 * stacking — which never glitches — and GSAP ScrollTrigger only for a subtle
 * scale-back scrub as each card gets covered by the next one.
 */
import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

interface ScrollStackProps {
  cards: ReactNode[];
  className?: string;
  cardClassName?: string;
}

export default function ScrollStack({ cards, className, cardClassName }: ScrollStackProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const total = cardsRef.current.length;
      cardsRef.current.forEach((card, index) => {
        if (!card || index === total - 1) return; // last card is never covered

        // As the NEXT card scrolls over this one, gently scale this card back
        gsap.to(card, {
          scale: 0.95 - index * 0.012,
          y: -(6 + index * 3),
          ease: "none",
          scrollTrigger: {
            trigger: cardsRef.current[index + 1] as HTMLDivElement,
            start: "top bottom",
            end: "top 25%",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      });
    }, section);

    // Recalculate once fonts/images settle
    const refresh = () => ScrollTrigger.refresh();
    const timer = setTimeout(refresh, 600);
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [cards.length]);

  return (
    <div ref={sectionRef} className={cn("relative", className)}>
      {cards.map((card, index) => (
        <div
          key={index}
          ref={(el) => {
            cardsRef.current[index] = el;
          }}
          className={cn(
            "will-change-transform",
            // Sticky stacking: each card parks slightly lower than the previous
            // one so the pile peeks out — pure CSS, smooth with any scroller.
            "sticky",
            index > 0 && "mt-6 sm:mt-8",
            "rounded-3xl border border-border bg-card shadow-card",
            cardClassName
          )}
          style={{ top: `calc(5.5rem + ${index * 0.9}rem)` }}
        >
          {card}
        </div>
      ))}
    </div>
  );
}
