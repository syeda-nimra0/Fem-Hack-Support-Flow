

/**
 * ScrollFloat — GSAP ScrollTrigger per-character reveal for headings.
 * Adapted from upload/code.md (react-bits ScrollFloat), restyled for SupportFlow.
 */
import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

interface ScrollFloatProps {
  children?: string;
  text?: string;
  className?: string;
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "p";
}

export default function ScrollFloat({
  children,
  text,
  className,
  containerClassName = "",
  textClassName = "",
  animationDuration = 1,
  ease = "back.inOut(2)",
  stagger = 0.02,
  as: Tag = "h2",
}: ScrollFloatProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const content = text ?? children ?? "";

  const splitText = useMemo(
    () =>
      content.split("").map((char, index) => (
        <span className="char" key={index} aria-hidden>
          {char === " " ? "\u00A0" : char}
        </span>
      )),
    [content]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const charElements = el.querySelectorAll(".char");

    const tween = gsap.fromTo(
      charElements,
      {
        willChange: "opacity, transform",
        opacity: 0,
        yPercent: 110,
        scaleY: 2,
        scaleX: 0.7,
        transformOrigin: "50% 0%",
      },
      {
        duration: animationDuration,
        ease,
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        stagger,
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          end: "top 45%",
          scrub: 0.6,
        },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [content, animationDuration, ease, stagger, className, containerClassName]);

  return (
    <Tag ref={containerRef} className={cn("sf-scroll-float", className, containerClassName)}>
      <span className={cn("inline-block", textClassName)}>
        <span className="sr-only">{content}</span>
        {splitText}
      </span>
    </Tag>
  );
}
