import { useId, useMemo, useRef, useState } from 'react';
import { ChartCard, ChartTooltip, MARK } from './ChartCard';
import { formatCompact, type TrendPoint } from './types';

const W = 520;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 12;
const PAD_B = 24;

function defaultFormatTime(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Single-series line over time with a soft area wash — the "how is this
 * moving" chart (pipeline over syncs, spend over days, throughput). Dataviz
 * spec: 2px round-joined line, ~10% area fill, hairline grid on clean ticks,
 * end dot with a surface ring, crosshair tooltip snapping to the nearest
 * point, and the ChartCard table twin. One axis, one series — comparison is
 * two cards, never a second y-scale.
 */
export function TrendLine({
  title,
  subtitle,
  points,
  formatValue = formatCompact,
  formatTime = defaultFormatTime,
  emptyText = 'No data yet — the trend appears from the second data point',
  height = 176,
}: {
  title: string;
  subtitle?: string;
  points: TrendPoint[];
  formatValue?: (v: number) => string;
  formatTime?: (d: Date) => string;
  emptyText?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  const pts = useMemo(
    () =>
      points
        .map((p) => ({ t: new Date(p.t), v: p.v }))
        .filter((p) => !Number.isNaN(p.t.getTime()))
        .sort((a, b) => a.t.getTime() - b.t.getTime()),
    [points],
  );

  const table = {
    head: ['When', 'Value'],
    rows: pts.map((p) => [formatTime(p.t), formatValue(p.v)]),
  };

  if (pts.length < 2) {
    return (
      <ChartCard title={title} subtitle={subtitle} table={table}>
        <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      </ChartCard>
    );
  }

  const H = height;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const vMax = Math.max(...pts.map((p) => p.v), 1);
  const yTicks = niceTicks(vMax);
  const yMax = yTicks[yTicks.length - 1];
  const t0 = pts[0].t.getTime();
  const t1 = pts[pts.length - 1].t.getTime();
  const span = Math.max(t1 - t0, 1);

  const px = (p: { t: Date }) => PAD_L + ((p.t.getTime() - t0) / span) * plotW;
  const py = (p: { v: number }) => PAD_T + (1 - p.v / yMax) * plotH;

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p)} ${py(p)}`).join(' ');
  const areaPath = `${linePath} L ${px(pts[pts.length - 1])} ${PAD_T + plotH} L ${px(pts[0])} ${PAD_T + plotH} Z`;
  const last = pts[pts.length - 1];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xIn = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(px(p) - xIn);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  return (
    <ChartCard title={title} subtitle={subtitle} table={table}>
      <div ref={wrapRef} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={title}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* hairline grid + clean ticks (they carry the unlabeled values) */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={PAD_T + (1 - v / yMax) * plotH}
                y2={PAD_T + (1 - v / yMax) * plotH}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 8}
                y={PAD_T + (1 - v / yMax) * plotH}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-muted-foreground text-[11px]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatValue(v)}
              </text>
            </g>
          ))}
          {/* x extent labels only — the tooltip carries the rest */}
          <text x={PAD_L} y={H - 6} className="fill-muted-foreground text-[11px]">
            {formatTime(pts[0].t)}
          </text>
          <text x={W - PAD_R} y={H - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
            {formatTime(last.t)}
          </text>

          {/* soft gradient area wash (18% → 0%), 2px line, ringed end dot */}
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MARK} stopOpacity={0.18} />
              <stop offset="100%" stopColor={MARK} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={MARK}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={px(last)} cy={py(last)} r={6.5} className="fill-card" />
          <circle cx={px(last)} cy={py(last)} r={4.5} fill={MARK} />

          {/* crosshair snaps to the nearest point */}
          {hover !== null && (
            <g>
              <line
                x1={px(pts[hover])}
                x2={px(pts[hover])}
                y1={PAD_T}
                y2={PAD_T + plotH}
                className="stroke-muted-foreground/40"
                strokeWidth={1}
              />
              <circle cx={px(pts[hover])} cy={py(pts[hover])} r={6.5} className="fill-card" />
              <circle cx={px(pts[hover])} cy={py(pts[hover])} r={4.5} fill={MARK} />
            </g>
          )}
        </svg>
        {hover !== null && wrapRef.current && (() => {
          const rendered = wrapRef.current.clientWidth;
          return (
            <ChartTooltip
              x={(px(pts[hover]) / W) * rendered}
              y={(py(pts[hover]) / H) * (rendered * (H / W))}
              strong={formatValue(pts[hover].v)}
              label={formatTime(pts[hover].t)}
            />
          );
        })()}
      </div>
    </ChartCard>
  );
}

/** 3–4 clean round ticks from just above 0 to just past max. */
function niceTicks(max: number): number[] {
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = step; v <= top; v += step) ticks.push(v);
  return ticks;
}
