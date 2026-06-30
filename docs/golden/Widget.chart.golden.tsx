/**
 * GOLDEN REFERENCE — CHART widget archetype (not built/imported; `.golden.tsx`
 * so tsc/vite ignore it). The BAR for a widget whose job is to show a TREND at a
 * glance (signups this week, spend over time, throughput). Match this polish +
 * state-handling, then ADAPT to the app's real series. Do NOT copy this content.
 *
 * Why it's the bar:
 *  - A KPI number + a tiny inline sparkline (no chart lib, no extra dep) drawn in
 *    the app's ACCENT via currentColor — token-only, legible light AND dark.
 *  - The chart grows with size (sparkline → larger sparkline + delta → chart +
 *    breakdown). Three sizes branched on `size` only, fixed-frame safe.
 *  - Loading skeleton + high-contrast error with a themed Retry.
 *
 * Domain here is a neutral fictional "signups this week" trend so it reads as ref.
 */
import { useEffect, useState } from 'react';
import { WidgetContainer, WidgetButton, WidgetBadge } from '@clarittyai/widget-toolkit';
import { getWidgetData, type WidgetData } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { WidgetSize } from '@/lib/widget-sizes';

/** Inline sparkline — token-colored (currentColor = the accent via text-accent). */
function Sparkline({ series, className }: { series: number[]; className?: string }) {
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
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden className={cn('text-accent', className)}>
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

export default function Widget({ size = 'medium' }: { size?: WidgetSize }) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setData(await getWidgetData(size));
      setError(null);
    } catch {
      setError('Could not load this trend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  if (loading) {
    return (
      <WidgetContainer size={size} className="animate-pulse">
        <div className="mb-4 h-4 w-1/2 rounded bg-muted" />
        <div className="h-8 w-full rounded bg-muted" />
      </WidgetContainer>
    );
  }

  if (error || !data) {
    return (
      <WidgetContainer size={size} className="flex flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-foreground">{error ?? 'No data yet'}</p>
        <WidgetButton variant="secondary" onClick={() => void fetchData()}>Retry</WidgetButton>
      </WidgetContainer>
    );
  }

  const series = data.series ?? [];
  const current = data.current ?? series[series.length - 1] ?? 0;
  const delta = data.deltaPct;
  const deltaBadge =
    typeof delta === 'number' ? (
      <WidgetBadge variant={delta >= 0 ? 'success' : 'error'}>
        {delta >= 0 ? '+' : ''}{delta}%
      </WidgetBadge>
    ) : null;

  // Small — KPI number over a compact sparkline.
  if (size === 'small') {
    return (
      <WidgetContainer size="small" className="flex flex-col justify-between">
        <div>
          <div className="text-3xl font-bold leading-none text-foreground tabular-nums">{current.toLocaleString()}</div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">{data.label}</div>
        </div>
        <Sparkline series={series} className="h-8 w-full" />
      </WidgetContainer>
    );
  }

  // Medium — KPI + delta on the left, sparkline filling the right.
  if (size === 'medium') {
    return (
      <WidgetContainer size="medium" className="flex flex-row items-center gap-4">
        <div className="flex w-[40%] flex-shrink-0 flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-3xl font-bold leading-none text-foreground tabular-nums">{current.toLocaleString()}</span>
          </div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">{data.label}</div>
          {deltaBadge ? <div className="mt-2">{deltaBadge}</div> : null}
        </div>
        <Sparkline series={series} className="h-12 min-w-0 flex-1" />
      </WidgetContainer>
    );
  }

  // Large — header KPI + delta, a bigger chart, then a short breakdown.
  const breakdown = data.breakdown ?? [];
  return (
    <WidgetContainer size="large" className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <span className="text-4xl font-bold leading-none text-foreground tabular-nums">{current.toLocaleString()}</span>
        {deltaBadge}
      </div>
      <div className="mt-1 text-sm font-medium text-muted-foreground">{data.label}</div>
      <Sparkline series={series} className="mt-3 h-16 w-full" />
      <div className="mt-auto flex flex-col gap-2 pt-3">
        {breakdown.slice(0, 2).map((b) => (
          <div key={b.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{b.label}</span>
            <span className="font-medium text-foreground tabular-nums">{b.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </WidgetContainer>
  );
}
