

/**
 * SlideArrowButton — CTA button where the accent slides in on hover.
 * Adapted from upload/Code 2.md (animata SlideArrowButton), brand color fixed.
 */
import { ArrowRight } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

interface SlideArrowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  primaryColor?: string;
}

export default function SlideArrowButton({
  text = "Get Started",
  primaryColor = "#3368A0",
  className = "",
  ...props
}: SlideArrowButtonProps) {
  return (
    <button
      className={cn(
        "group/slide relative rounded-full border border-border bg-card p-2 text-base font-semibold",
        "transition-shadow hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
      {...props}
    >
      <div
        className="absolute left-0 top-0 flex h-full w-11 items-center justify-end rounded-full transition-all duration-300 ease-in-out group-hover/slide:w-full"
        style={{ backgroundColor: primaryColor }}
        aria-hidden
      >
        <span className="mr-3 text-white transition-transform duration-300 group-hover/slide:translate-x-1">
          <ArrowRight size={18} />
        </span>
      </div>
      <span className="relative left-4 z-10 whitespace-nowrap px-7 text-foreground transition-all duration-300 ease-in-out group-hover/slide:-left-3 group-hover/slide:text-white">
        {text}
      </span>
    </button>
  );
}
