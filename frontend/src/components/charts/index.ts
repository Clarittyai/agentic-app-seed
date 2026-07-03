/**
 * B7 — The chart kit: single-series, token-driven, table-twinned SVG charts.
 *
 * Every chart follows the dataviz method: thin marks (≤24px bars, 2px lines,
 * 4px rounded data-ends), ONE series hue (`--chart-1`, defaults to the brand
 * accent — override in theme.css), all chart TEXT in text tokens, hover
 * tooltips, and a table-view toggle as the accessibility twin. One axis, one
 * series per chart — comparison = two chart cards, NEVER a dual axis.
 *
 * Which chart, for which domain: see docs/golden/INDEX.md (the domain →
 * design matrix). Data-heavy apps (sales/GTM, finance, analytics) lead their
 * landing page with these.
 *
 * - BarList   — magnitude by category (pipeline by stage, backlog by status).
 * - TrendLine — a value over time (bookings over syncs, spend over days).
 * - Sparkline — the widget-safe inline trend (the ONLY chart allowed inside
 *               the fixed-frame Widget surface).
 */
export { BarList } from './BarList';
export { TrendLine } from './TrendLine';
export { Sparkline } from './Sparkline';
export { ChartCard, ChartTooltip, MARK } from './ChartCard';
export * from './types';
