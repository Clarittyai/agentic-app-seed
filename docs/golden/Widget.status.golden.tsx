/**
 * GOLDEN REFERENCE — STATUS widget archetype (not built/imported; `.golden.tsx`
 * so tsc/vite ignore it). The BAR for a widget whose job is to answer ONE
 * yes/no-ish health question at a glance (is the site up, is the pipeline
 * on-track, are we within budget). Match this polish + state-handling, then
 * ADAPT to the app's real status. Do NOT copy this content.
 *
 * Why it's the bar:
 *  - The STATUS is the focal element (a word + a tone), not a number; the tone
 *    maps to the kit's success/warning/error badge tones (token-only, AA).
 *  - Small = status + dot; medium = status + one detail; large = status + the
 *    components that make it up, each with its own badge. Branched on `size` only.
 *  - Loading skeleton + high-contrast error with a themed Retry.
 *
 * Domain here is a neutral fictional "service health" status so it reads as ref.
 */
import { useEffect, useState } from 'react';
import { WidgetContainer, WidgetButton, WidgetBadge } from '@clarittyai/widget-toolkit';
import { getWidgetData, type WidgetData } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { WidgetSize } from '@/lib/widget-sizes';

type Health = 'healthy' | 'degraded' | 'down';
const TONE: Record<Health, { badge: 'success' | 'warning' | 'error'; text: string; label: string }> = {
  healthy: { badge: 'success', text: 'text-foreground', label: 'All systems go' },
  degraded: { badge: 'warning', text: 'text-foreground', label: 'Degraded' },
  down: { badge: 'error', text: 'text-foreground', label: 'Outage' },
};

export default function Widget({ size = 'medium' }: { size?: WidgetSize }) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setData(await getWidgetData(size));
      setError(null);
    } catch {
      setError('Could not load status');
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
        <div className="mb-4 h-4 w-1/3 rounded bg-muted" />
        <div className="h-6 w-1/2 rounded bg-muted" />
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

  const status = (data.status as Health) ?? 'healthy';
  const tone = TONE[status] ?? TONE.healthy;

  // Small — a status word + a dot badge.
  if (size === 'small') {
    return (
      <WidgetContainer size="small" className="flex flex-col justify-between">
        <WidgetBadge variant={tone.badge} showDot>{status}</WidgetBadge>
        <div>
          <div className={cn('text-2xl font-bold leading-tight', tone.text)}>{tone.label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{data.label}</div>
        </div>
      </WidgetContainer>
    );
  }

  // Medium — status + the one supporting detail.
  if (size === 'medium') {
    return (
      <WidgetContainer size="medium" className="flex flex-col justify-center gap-2">
        <WidgetBadge variant={tone.badge} showDot>{status}</WidgetBadge>
        <div className={cn('text-2xl font-bold leading-tight', tone.text)}>{tone.label}</div>
        {data.summary ? <p className="truncate text-sm text-muted-foreground">{data.summary}</p> : null}
      </WidgetContainer>
    );
  }

  // Large — status header + the components that make it up.
  const components = data.components ?? [];
  return (
    <WidgetContainer size="large" className="flex flex-col">
      <div className="flex items-center justify-between">
        <div className={cn('text-2xl font-bold leading-tight', tone.text)}>{tone.label}</div>
        <WidgetBadge variant={tone.badge} showDot>{status}</WidgetBadge>
      </div>
      {data.summary ? <p className="mt-1 text-sm text-muted-foreground">{data.summary}</p> : null}
      <div className="mt-auto flex flex-col gap-2.5 pt-4 overflow-hidden">
        {components.slice(0, 4).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
            <WidgetBadge variant={c.ok ? 'success' : 'error'} showDot>{c.ok ? 'ok' : 'down'}</WidgetBadge>
          </div>
        ))}
      </div>
    </WidgetContainer>
  );
}
