/**
 * DonutChart — animated circular progress indicator.
 * Adapted from Code 2.md (DonutChart component).
 * Used for dashboard statistics (resolution rate, ticket distribution, etc.)
 */
import { useEffect, useState } from 'react';
import './DonutChart.css';

export default function DonutChart({
  size = 120,
  progress = 0,
  progressColor = 'var(--color-primary)',
  trackColor = 'var(--color-border)',
  circleWidth = 10,
  progressWidth = 10,
  rounded = true,
  className = '',
  children,
}) {
  const [shouldUseValue, setShouldUseValue] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShouldUseValue(true), 200);
    return () => clearTimeout(t);
  }, []);

  const safeProgress = Math.min(100, Math.max(0, progress));
  const radius = size / 2 - Math.max(progressWidth, circleWidth) / 2;
  const circumference = Math.PI * radius * 2;
  const offset = shouldUseValue
    ? circumference * ((100 - safeProgress) / 100)
    : circumference;

  return (
    <div className={`donut-chart ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={circleWidth}
        />
        <circle
          r={radius}
          cx={size / 2}
          cy={size / 2}
          stroke={progressColor}
          strokeWidth={progressWidth}
          strokeLinecap={rounded ? 'round' : 'butt'}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      {children && <div className="donut-chart-content">{children}</div>}
    </div>
  );
}
