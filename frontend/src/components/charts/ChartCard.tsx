import { useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChartTable } from './types';

/** The single series hue for every chart — an HSL triple token (defaults to
 * the brand accent; override `--chart-1` in theme.css for a distinct dataviz
 * hue). MARKS wear it; chart TEXT always uses the text tokens. */
export const MARK = 'hsl(var(--chart-1))';

/**
 * Shared chart chrome: <figure> card with title/subtitle and the TABLE-TWIN
 * toggle — every chart's values must be reachable without hover or color
 * (the accessibility twin). Children render the chart itself.
 */
export function ChartCard({
  title,
  subtitle,
  table,
  children,
}: {
  title: string;
  subtitle?: string;
  table: ChartTable;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <figcaption>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </figcaption>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-label={showTable ? 'Show chart' : 'Show data table'}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {showTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
        </button>
      </div>
      {showTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              {table.head.map((h) => (
                <th key={h} className="py-1.5 pr-3 font-medium last:pr-0 last:text-right">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={cn(
                      'py-1.5 pr-3 last:pr-0',
                      j === r.length - 1
                        ? 'text-right font-medium tabular-nums text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        children
      )}
    </figure>
  );
}

/** One tooltip for every chart: strong value first, muted label after. */
export function ChartTooltip({
  x,
  y,
  strong,
  label,
}: {
  x: number;
  y: number;
  strong: string;
  label: string;
}) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-sm"
      style={{ left: x, top: y - 8 }}
    >
      <span className="font-semibold tabular-nums text-foreground">{strong}</span>
      <span className="ml-1.5 text-muted-foreground">{label}</span>
    </div>
  );
}
