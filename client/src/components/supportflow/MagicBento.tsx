

/**
 * MagicBento — feature card grid with GSAP particle bursts on hover,
 * 3D tilt and a solid spotlight ring. No gradients — brand colors only.
 * Adapted from upload/code.md (react-bits MagicBento / ParticleCard).
 */
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface MagicBentoProps {
  items: {
    id: string;
    title: string;
    description: string;
    icon: ReactNode;
    className?: string;
    particleColor?: string;
    large?: boolean;
  }[];
  className?: string;
}

export default function MagicBento({ items, className }: MagicBentoProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2",
        className
      )}
    >
      {items.map((item) => (
        <ParticleCard
          key={item.id}
          className={cn(
            "min-h-[190px]",
            item.large && "sm:col-span-2 lg:row-span-2 lg:min-h-full",
            item.className
          )}
          particleColor={item.particleColor}
        >
          <div className="flex h-full flex-col gap-2.5 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:h-5 [&_svg]:w-5">
              {item.icon}
            </span>
            <h3 className="text-base font-semibold leading-snug">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        </ParticleCard>
      ))}
    </div>
  );
}

function ParticleCard({
  children,
  className,
  particleColor = "#66A3BF",
  particleCount = 10,
  enableTilt = true,
}: {
  children: ReactNode;
  className?: string;
  particleColor?: string;
  particleCount?: number;
  enableTilt?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<HTMLElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHovered = useRef(false);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.25,
        ease: "back.in(1.7)",
        onComplete: () => particle.remove(),
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    const card = cardRef.current;
    if (!card || !isHovered.current) return;
    const { width, height } = card.getBoundingClientRect();

    for (let index = 0; index < particleCount; index++) {
      const timeoutId = setTimeout(() => {
        if (!isHovered.current || !cardRef.current) return;
        const particle = document.createElement("span");
        particle.className = "sf-particle";
        particle.style.backgroundColor = particleColor;
        particle.style.left = `${Math.random() * width}px`;
        particle.style.top = `${Math.random() * height}px`;
        cardRef.current.appendChild(particle);
        particlesRef.current.push(particle);

        gsap.fromTo(particle, { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.7, duration: 0.3, ease: "back.out(1.7)" });
        gsap.to(particle, {
          x: (Math.random() - 0.5) * 90,
          y: (Math.random() - 0.5) * 90,
          duration: 2 + Math.random() * 1.6,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
        gsap.to(particle, {
          opacity: 0.25,
          duration: 1.4,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, index * 90);
      timeoutsRef.current.push(timeoutId);
    }
  }, [particleCount, particleColor]);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const onMouseEnter = () => {
      isHovered.current = true;
      animateParticles();
      if (enableTilt) {
        gsap.to(element, { rotateX: 4, rotateY: -4, duration: 0.35, ease: "power2.out", transformPerspective: 900 });
      }
      const ring = element.querySelector(".sf-bento-ring");
      if (ring) gsap.to(ring, { opacity: 1, duration: 0.3 });
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!enableTilt || !isHovered.current) return;
      const rect = element.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      gsap.to(element, { rotateY: px * 7, rotateX: -py * 7, duration: 0.4, ease: "power2.out", transformPerspective: 900 });
    };
    const onMouseLeave = () => {
      isHovered.current = false;
      clearParticles();
      if (enableTilt) {
        gsap.to(element, { rotateX: 0, rotateY: 0, duration: 0.4, ease: "power2.out" });
      }
      const ring = element.querySelector(".sf-bento-ring");
      if (ring) gsap.to(ring, { opacity: 0, duration: 0.3 });
    };

    element.addEventListener("mouseenter", onMouseEnter);
    element.addEventListener("mousemove", onMouseMove);
    element.addEventListener("mouseleave", onMouseLeave);
    return () => {
      element.removeEventListener("mouseenter", onMouseEnter);
      element.removeEventListener("mousemove", onMouseMove);
      element.removeEventListener("mouseleave", onMouseLeave);
      clearParticles();
    };
  }, [animateParticles, clearParticles, enableTilt]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative transform-gpu overflow-hidden rounded-2xl border border-border bg-card shadow-card",
        className
      )}
    >
      <span
        className="sf-bento-ring pointer-events-none absolute inset-0 rounded-2xl border-2 opacity-0"
        style={{ borderColor: particleColor }}
        aria-hidden
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
