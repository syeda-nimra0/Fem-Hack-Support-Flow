

/**
 * ScrollStack — cards stack on top of each other while scrolling.
 * GSAP ScrollTrigger adaptation of upload/code.md (react-bits ScrollStack),
 * driven by the page's Lenis smooth scroll.
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
        if (!card) return;
        const offset = (total - 1 - index) * 26;
        const scaleTo = 0.94 - index * 0.035;

        gsap.fromTo(
          card,
          { scale: 1, y: offset * 0.4 },
          {
            scale: scaleTo,
            y: offset,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top 22%",
              end: "bottom 30%",
              scrub: 0.5,
              pin: index < total - 1,
              pinSpacing: false,
              invalidateOnRefresh: true,
            },
          }
        );
      });
    }, section);

    // Recalculate once fonts settle
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
            index > 0 && "-mt-8",
            "rounded-3xl border border-border bg-card shadow-card",
            cardClassName
          )}
        >
          {card}
        </div>
      ))}
    </div>
  );
}
