import { useMemo, useRef, useState } from 'react';
import { ChartCard, ChartTooltip, MARK } from './ChartCard';
import { formatCompact, type BarDatum } from './types';

const BAR_H = 20; // thin-mark cap is 24px
const ROW_H = 34;
const LABEL_W = 108;
const VALUE_W = 56;
const W = 520;

/**
 * Horizontal single-hue bars — magnitude by category (pipeline by stage,
 * backlog by status, revenue by product). Marks follow the dataviz spec:
 * ≤24px bars, 4px rounded DATA end / square baseline, value at the tip in
 * text tokens, hover dims siblings + tooltip, and the ChartCard table twin.
 * Rows beyond `maxRows` fold into "Other" (never an unbounded wall of bars).
 */
export function BarList({
  title,
  subtitle,
  data,
  formatValue = formatCompact,
  maxRows = 8,
  emptyText = 'No data yet',
}: {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  formatValue?: (v: number) => string;
  maxRows?: number;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length <= maxRows) return sorted;
    const head = sorted.slice(0, maxRows - 1);
    const tail = sorted.slice(maxRows - 1);
    return [
      ...head,
      {
        label: 'Other',
        value: tail.reduce((s, d) => s + d.value, 0),
        detail: `${tail.length} more`,
      },
    ];
  }, [data, maxRows]);

  const table = {
    head: ['Category', 'Value'],
    rows: rows.map((d) => [d.label, formatValue(d.value)]),
  };

  if (rows.length === 0) {
    return (
      <ChartCard title={title} subtitle={subtitle} table={table}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      </ChartCard>
    );
  }

  const max = Math.max(...rows.map((d) => d.value), 1);
  const plotW = W - LABEL_W - VALUE_W;
  const H = rows.length * ROW_H;

  return (
    <ChartCard title={title} subtitle={subtitle} table={table}>
      <div ref={wrapRef} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={title}>
          {rows.map((d, i) => {
            const w = Math.max((d.value / max) * plotW, 2);
            const y = i * ROW_H + (ROW_H - BAR_H) / 2;
            const r = Math.min(4, w); // 4px rounded data-end, square baseline
            return (
              <g key={d.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                {/* hit target bigger than the mark */}
                <rect x={0} y={i * ROW_H} width={W} height={ROW_H} fill="transparent" />
                <text
                  x={LABEL_W - 10}
                  y={y + BAR_H / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="fill-muted-foreground text-[12px]"
                >
                  {d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label}
                </text>
                <path
                  d={`M ${LABEL_W} ${y} H ${LABEL_W + w - r} Q ${LABEL_W + w} ${y} ${LABEL_W + w} ${y + r} V ${y + BAR_H - r} Q ${LABEL_W + w} ${y + BAR_H} ${LABEL_W + w - r} ${y + BAR_H} H ${LABEL_W} Z`}
                  fill={MARK}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                {/* value at the bar tip — text token, never the series color */}
                <text
                  x={LABEL_W + w + 8}
                  y={y + BAR_H / 2}
                  dominantBaseline="central"
                  className="fill-foreground text-[12px] font-medium"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatValue(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
        {hover !== null && wrapRef.current && (() => {
          const rendered = wrapRef.current.clientWidth;
          const barW = Math.max((rows[hover].value / max) * plotW, 2);
          const svgX = LABEL_W + barW / 2;
          const svgY = hover * ROW_H + (ROW_H - BAR_H) / 2;
          return (
            <ChartTooltip
              x={(svgX / W) * rendered}
              y={(svgY / H) * (rendered * (H / W))}
              strong={formatValue(rows[hover].value)}
              label={rows[hover].detail ? `${rows[hover].label} · ${rows[hover].detail}` : rows[hover].label}
            />
          );
        })()}
      </div>
    </ChartCard>
  );
}
