/**
 * GOLDEN REFERENCE — SINGLE-METRIC widget archetype (not built/imported;
 * `.golden.tsx` so tsc/vite ignore it). The BAR for a widget whose ONE job is to
 * show a single hero number at a glance (revenue today, open tickets, days left).
 * Match this polish + state-handling, then ADAPT to the app's real metric. Do
 * NOT copy this content.
 *
 * Why it's the bar:
 *  - ONE focal number per size; the three sizes are genuinely different layouts
 *    branched on `size` only (no responsive prefixes, no @media).
 *  - Token-only color (text-foreground / text-muted-foreground / text-accent via
 *    WidgetContainer) — inherits the app palette, legible light AND dark.
 *  - The hero scales DOWN as the size grows (it shares space with context); a
 *    delta gives the number meaning; large adds a small breakdown.
 *  - Loading skeleton + high-contrast error with a themed Retry.
 *
 * Domain here is a neutral fictional "revenue today" metric so it reads as ref.
 */
import { useEffect, useState } from 'react';
import { WidgetContainer, WidgetButton, WidgetBadge } from '@clarittyai/widget-toolkit';
import { getWidgetData, type WidgetData } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { WidgetSize } from '@/lib/widget-sizes';

export default function Widget({ size = 'medium' }: { size?: WidgetSize }) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setData(await getWidgetData(size));
      setError(null);
    } catch {
      setError('Could not load this metric');
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
        <div className="h-8 w-2/3 rounded bg-muted" />
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

  const value = data.value ?? 0;
  const display = `${data.unit ?? ''}${value.toLocaleString()}`;
  const delta = data.deltaPct;
  const deltaBadge =
    typeof delta === 'number' ? (
      <WidgetBadge variant={delta >= 0 ? 'success' : 'error'}>
        {delta >= 0 ? '+' : ''}{delta}%
      </WidgetBadge>
    ) : null;

  // Small — the hero number alone, label beneath.
  if (size === 'small') {
    return (
      <WidgetContainer size="small" className="flex flex-col justify-center">
        <div className="text-5xl font-bold leading-none text-foreground tabular-nums">{display}</div>
        <div className="mt-2 text-xs font-medium text-muted-foreground">{data.label}</div>
      </WidgetContainer>
    );
  }

  // Medium — hero + the delta that gives it meaning.
  if (size === 'medium') {
    return (
      <WidgetContainer size="medium" className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-4xl font-bold leading-none text-foreground tabular-nums">{display}</span>
          {deltaBadge}
        </div>
        <div className="mt-2 text-sm font-medium text-muted-foreground">{data.label}</div>
      </WidgetContainer>
    );
  }

  // Large — hero + delta header, then a small supporting breakdown.
  const breakdown = data.breakdown ?? [];
  return (
    <WidgetContainer size="large" className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <span className="text-5xl font-bold leading-none text-foreground tabular-nums">{display}</span>
        {deltaBadge}
      </div>
      <div className="mt-1 text-sm font-medium text-muted-foreground">{data.label}</div>
      <div className="mt-auto flex flex-col gap-2 pt-4">
        {breakdown.slice(0, 3).map((b) => (
          <div key={b.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{b.label}</span>
            <span className="font-medium text-foreground tabular-nums">{b.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </WidgetContainer>
  );
}
