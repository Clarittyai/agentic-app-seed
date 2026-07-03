import { cn } from '@/lib/utils';

/**
 * Inline sparkline — the ONLY chart piece allowed inside the fixed-frame
 * Widget surface (no pointer logic, no tooltip, scales with its box).
 * Token-colored via currentColor (defaults to the accent through
 * `text-accent`); pass a className to recolor or size.
 */
export function Sparkline({ series, className }: { series: number[]; className?: string }) {
  if (series.length < 2) return null;
  const w = 100;
  const h = 32;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const pts = series
    .map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / span) * h}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn('text-accent', className)}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
