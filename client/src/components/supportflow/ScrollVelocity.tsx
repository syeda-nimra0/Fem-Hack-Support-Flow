

/**
 * ScrollVelocity — infinite marquee whose speed reacts to scroll velocity.
 * Adapted from upload/code.md (react-bits ScrollVelocity) using framer-motion.
 */
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { cn } from "@/lib/utils";

function useElementWidth(ref: React.RefObject<HTMLSpanElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const measure = () => setWidth(ref.current?.offsetWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref]);
  return width;
}

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  const mod = (((v - min) % range) + range) % range;
  return mod + min;
}

interface VelocityTextProps {
  children: string;
  baseVelocity: number;
  numCopies: number;
  className?: string;
  rowClassName?: string;
}

function VelocityText({ children, baseVelocity, numCopies, className, rowClassName }: VelocityTextProps) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });

  const copyRef = useRef<HTMLSpanElement | null>(null);
  const copyWidth = useElementWidth(copyRef);

  const x = useTransform(baseX, (v) => {
    if (copyWidth === 0) return "0px";
    return `${wrap(-copyWidth, 0, v)}px`;
  });

  const directionFactor = useRef(1);
  useAnimationFrame((_, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  const spans = [];
  for (let i = 0; i < numCopies; i++) {
    spans.push(
      <span className={className} key={i} ref={i === 0 ? copyRef : null}>
        {children}
        <span className="mx-6 inline-block align-middle" aria-hidden>
          •
        </span>
      </span>
    );
  }

  return (
    <div className={cn("sf-parallax", rowClassName)}>
      <motion.div className="sf-scroller" style={{ x }}>
        {spans}
      </motion.div>
    </div>
  );
}

interface ScrollVelocityProps {
  texts: string[];
  velocity?: number;
  numCopies?: number;
  className?: string;
  rowClassName?: string;
}

export default function ScrollVelocity({
  texts,
  velocity = 40,
  numCopies = 6,
  className,
  rowClassName,
}: ScrollVelocityProps) {
  return (
    <section className={className} aria-hidden>
      {texts.map((text, index) => (
        <VelocityText
          key={index}
          className={className}
          rowClassName={rowClassName}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          numCopies={numCopies}
        >
          {text}
        </VelocityText>
      ))}
    </section>
  );
}
