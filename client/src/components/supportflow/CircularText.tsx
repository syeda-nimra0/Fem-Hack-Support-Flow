

/**
 * CircularText — rotating circular text badge.
 * Adapted from upload/code.md (react-bits CircularText); rAF-driven rotation
 * with hover speed-up, styled with the SupportFlow palette.
 */
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface CircularTextProps {
  text: string;
  spinDuration?: number;
  className?: string;
  textClassName?: string;
}

export default function CircularText({
  text,
  spinDuration = 18,
  className,
  textClassName,
}: CircularTextProps) {
  const letters = Array.from(text);
  const rotation = useMotionValue(0);
  const smooth = useSpring(rotation, { stiffness: 120, damping: 20 });
  const speedRef = useRef(1);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      rotation.set(rotation.get() + (delta / 1000) * (360 / spinDuration) * speedRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rotation, spinDuration]);

  return (
    <motion.div
      className={cn("sf-circular-text", className)}
      style={{ rotate: smooth }}
      onMouseEnter={() => (speedRef.current = 3.5)}
      onMouseLeave={() => (speedRef.current = 1)}
      aria-hidden
    >
      {letters.map((letter, i) => {
        const rotationDeg = (360 / letters.length) * i;
        return (
          <span key={i} className={textClassName} style={{ transform: `rotate(${rotationDeg}deg)` }}>
            {letter === " " ? "\u00A0" : letter}
          </span>
        );
      })}
    </motion.div>
  );
}
