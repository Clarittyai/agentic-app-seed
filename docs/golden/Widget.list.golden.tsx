/**
 * GOLDEN REFERENCE — LIST widget archetype (not built/imported; `.golden.tsx` so
 * tsc/vite ignore it). The BAR for a widget whose job is to surface the TOP few
 * items at a glance (next tasks, recent leads, today's priorities). Match this
 * polish + state-handling, then ADAPT to the app's real items. Do NOT copy this
 * content.
 *
 * Why it's the bar:
 *  - A count is the anchor; the list grows with size (1 peek → 2 → 3-4), never
 *    overflowing the fixed frame. Three sizes branched on `size` only.
 *  - Token-only color, ≥44px tap target on the action, truncation on every line
 *    so nothing escapes the widget bounds.
 *  - Loading skeleton + high-contrast error with a themed Retry; a calm
 *    "all clear" empty state.
 *
 * Domain here is a neutral fictional "today's priorities" list so it reads as ref.
 */
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { WidgetContainer, WidgetButton, WidgetBadge } from '@clarittyai/widget-toolkit';
import { getWidgetData, openList, type WidgetData } from '@/lib/api';
import { runQuickAction, notifyWidgetStateChanged } from '@/lib/widget-actions';
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
      setError('Could not load your list');
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
        <div className="mb-2 h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
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

  const items = data.items ?? [];
  const count = data.count ?? items.length;
  const top = items[0];

  // Small — the count + the single most important item.
  if (size === 'small') {
    return (
      <WidgetContainer size="small" className="flex flex-col justify-between">
        <div>
          <div className="text-4xl font-bold leading-none text-foreground tabular-nums">{count}</div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">{data.label}</div>
        </div>
        {top ? (
          <p className="truncate text-sm font-medium text-foreground">{top.title}</p>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">All clear</span>
        )}
      </WidgetContainer>
    );
  }

  // Medium — count anchor + a 2-item peek.
  if (size === 'medium') {
    return (
      <WidgetContainer size="medium" className="flex flex-row items-center gap-4">
        <div className="flex w-[34%] flex-shrink-0 flex-col justify-center">
          <div className="text-4xl font-bold leading-none text-foreground tabular-nums">{count}</div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">{data.label}</div>
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          {items.length > 0 ? (
            items.slice(0, 2).map((it) => (
              <p key={it.id} className="truncate text-sm font-medium text-foreground">{it.title}</p>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">All clear</span>
          )}
        </div>
      </WidgetContainer>
    );
  }

  // Large — header + ranked list (3-4) + a single primary action.
  return (
    <WidgetContainer size="large" className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold leading-none text-foreground tabular-nums">{count}</span>
          <span className="text-sm text-muted-foreground">{data.label}</span>
        </div>
        {count > 0 && <WidgetBadge variant="info">Top {Math.min(items.length, 4)}</WidgetBadge>}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
        {items.length > 0 ? (
          items.slice(0, 4).map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-foreground">{it.title}</p>
              {it.meta ? <span className="flex-shrink-0 text-xs text-muted-foreground">{it.meta}</span> : null}
            </div>
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">All clear</div>
        )}
      </div>
      {items.length > 0 && (
        <WidgetButton
          variant="primary"
          icon={<ArrowRight className="h-4 w-4" />}
          className="mt-3 w-full"
          onClick={() => void runQuickAction({ actionId: 'open-list', run: openList }).then(notifyWidgetStateChanged)}
        >
          Open all
        </WidgetButton>
      )}
    </WidgetContainer>
  );
}
