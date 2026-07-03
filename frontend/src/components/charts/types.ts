/** Data shapes for the chart kit — self-contained (never import from api.ts;
 * shape your API payloads into these at the call site). */

export interface BarDatum {
  label: string;
  value: number;
  /** Optional extra line for the tooltip (e.g. "4 deals"). */
  detail?: string;
}

export interface TrendPoint {
  /** ISO string, epoch ms, or Date. */
  t: string | number | Date;
  v: number;
}

export interface ChartTable {
  head: string[];
  rows: (string | number)[][];
}

/**
 * The conventional payload for a trend widget (`GET /api/widget` for chart
 * widgets should emit this — see docs/golden/Widget.chart.golden.tsx).
 */
export interface TrendWidgetData {
  label: string;
  series: number[];
  current?: number;
  deltaPct?: number;
  breakdown?: { label: string; value: number }[];
  last_updated?: string;
}

/** Compact number formatting: 1284 → "1.3K", 4200000 → "4.2M". The default
 * `formatValue` for BarList/TrendLine — pass your own for currency etc. */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
}
