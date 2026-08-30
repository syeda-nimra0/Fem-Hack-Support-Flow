

/**
 * DonutChart — animated SVG progress ring used across the dashboards.
 * Adapted from upload/Code 2.md (animata DonutChart), themed with brand colors.
 */
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DonutChartProps {
  size: number;
  progress: number; // 0 - 100
  progressClassName?: string;
  trackClassName?: string;
  circleWidth?: number;
  progressWidth?: number;
  rounded?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function DonutChart({
  size,
  progress,
  progressClassName = "text-[#3368A0]",
  trackClassName = "text-black/10 dark:text-white/10",
  circleWidth = 12,
  progressWidth = 12,
  rounded = true,
  className,
  children,
}: DonutChartProps) {
  const [shouldUseValue, setShouldUseValue] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShouldUseValue(true), 120);
    return () => clearTimeout(timeout);
  }, []);

  const radius = size / 2 - Math.max(progressWidth, circleWidth) / 2;
  const circumference = Math.PI * radius * 2;
  const clamped = Math.max(0, Math.min(100, progress));
  const percentage = shouldUseValue ? circumference * ((100 - clamped) / 100) : circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden
      >
        <circle
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={`${circleWidth}px`}
          className={cn("duration-700", trackClassName)}
        />
        <circle
          r={radius}
          cx={size / 2}
          cy={size / 2}
          stroke="currentColor"
          className={cn("duration-700 [transition-property:stroke-dashoffset]", progressClassName)}
          strokeWidth={`${progressWidth}px`}
          strokeLinecap={rounded ? "round" : "butt"}
          fill="transparent"
          strokeDasharray={`${circumference}px`}
          strokeDashoffset={`${percentage}px`}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
}
