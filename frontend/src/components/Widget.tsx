import { useEffect, useState } from 'react';
import { WidgetContainer, WidgetButton, WidgetBadge } from '@clarittyai/widget-toolkit';
import { getResults, type AppResult } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { WidgetSize } from '@/lib/widget-sizes';

export type { WidgetSize };

interface WidgetProps {
  size?: WidgetSize;
  className?: string;
}

/**
 * The dashboard widget — built from the published Claritty UI kit
 * (@clarittyai/widget-toolkit): WidgetContainer owns the liquid-glass surface,
 * rounded-3xl, exact sizes, padding, overflow, and the data-widget-size attr;
 * WidgetButton / WidgetBadge keep actions + chips on-brand. This is the shape
 * every generated app follows (see the platform's WIDGET_RULES).
 *
 * It shows the REAL output the app's automation (workflows / the Team) produced:
 * every run auto-persists into the Result store, read here via getResults(). A
 * generated app that models its own domain entity swaps getResults() for that
 * entity's list — the shape (a count + a short list) stays the same.
 */
export default function Widget({ size = 'medium', className }: WidgetProps) {
  const [results, setResults] = useState<AppResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 30000);
    // Refetch immediately when something in the same page produces output
    // (e.g. the agent-graph runner's "Run trigger" completes a workflow).
    const onRefresh = () => void fetchData();
    window.addEventListener('claritty:widget-refresh', onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('claritty:widget-refresh', onRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const fetchData = async () => {
    try {
      setResults(await getResults());
      setError(null);
    } catch (err) {
      setError('Could not load recent output');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <WidgetContainer size={size} className={cn('animate-pulse', className)}>
        <div className="mb-4 h-4 w-3/4 rounded bg-muted" />
        <div className="h-8 w-1/2 rounded bg-muted" />
      </WidgetContainer>
    );
  }

  if (error || !results) {
    // High-contrast on the glass surface in BOTH themes: the headline uses
    // text-foreground (muted-on-glass is ~2:1 and reads as invisible), and the
    // Retry uses the themed WidgetButton — never a hardcoded blue.
    return (
      <WidgetContainer
        size={size}
        className={cn('flex flex-col items-center justify-center gap-2 text-center', className)}
      >
        <p className="text-sm font-medium text-foreground">{error ?? 'No data yet'}</p>
        <WidgetButton variant="secondary" onClick={() => void fetchData()}>
          Retry
        </WidgetButton>
      </WidgetContainer>
    );
  }

  const count = results.length;
  const top = results[0];

  // ---- Small: headline count + the latest item ----------------------------
  if (size === 'small') {
    return (
      <WidgetContainer size="small" className={cn('flex flex-col justify-between', className)}>
        <div>
          <div className={cn('text-5xl font-bold leading-none', count > 0 ? 'text-foreground' : 'text-muted-foreground')}>
            {count}
          </div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">
            recent result{count === 1 ? '' : 's'}
          </div>
        </div>
        {top ? (
          <p className="truncate text-sm font-medium text-foreground">{top.title}</p>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">Nothing yet</span>
        )}
      </WidgetContainer>
    );
  }

  // ---- Medium: count + a 2-item peek --------------------------------------
  if (size === 'medium') {
    const shown = results.slice(0, 2);
    return (
      <WidgetContainer size="medium" className={cn('flex flex-row items-center gap-4', className)}>
        <div className="flex w-[34%] flex-shrink-0 flex-col justify-center">
          <div className={cn('text-4xl font-bold leading-none', count > 0 ? 'text-foreground' : 'text-muted-foreground')}>
            {count}
          </div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">results</div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
          {shown.length > 0 ? (
            shown.map((r) => <ResultRow key={r.id} result={r} />)
          ) : (
            <span className="text-sm text-muted-foreground">Nothing yet</span>
          )}
        </div>
      </WidgetContainer>
    );
  }

  // ---- Large: header + up to 3 items + footer -----------------------------
  const shown = results.slice(0, 3);
  const hidden = Math.max(0, count - shown.length);
  return (
    <WidgetContainer size="large" className={cn('flex flex-col', className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold leading-none text-foreground">{count}</span>
          <span className="text-sm text-muted-foreground">results</span>
        </div>
        {count > 0 && <WidgetBadge variant="info">latest</WidgetBadge>}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        {shown.length > 0 ? (
          shown.map((r, i) => <ResultRow key={r.id} result={r} detail={i === 0} />)
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Nothing yet
          </div>
        )}
      </div>

      {hidden > 0 && (
        <div className="mt-3 truncate text-xs text-muted-foreground">+{hidden} more</div>
      )}
    </WidgetContainer>
  );
}

// One produced result: title (+ optional body detail on the large widget's top
// row) + a status badge. Read-only — the widget SHOWS output, it doesn't mutate.
function ResultRow({
  result,
  detail = false,
}: {
  result: AppResult;
  detail?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{result.title}</span>
        {detail && result.body && (
          <span className="block truncate text-xs text-muted-foreground">{result.body}</span>
        )}
      </div>
      {result.status && <WidgetBadge variant="neutral">{result.status}</WidgetBadge>}
    </div>
  );
}
