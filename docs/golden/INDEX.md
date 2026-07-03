# Golden index — pick the design that fits the DOMAIN

The goldens in this directory are the quality bar for generated UI. This file
is the **selection matrix**: given the app's domain (canonically
`app-config.json → clarity_marketplace.category`), it names what the landing
page should LEAD with on first run, which Dashboard/Widget golden to adapt,
and which chart-kit pieces (`frontend/src/components/charts`) belong on the
page. An app whose landing doesn't fit its domain reads as generated — this
matrix is how it reads as designed.

## Golden inventory

| File | The bar for |
|---|---|
| `Dashboard.golden.tsx` | the neutral base — KPI row + list (composition + states) |
| `Dashboard.table.golden.tsx` | data-heavy queue: orders, invoices, inventory, leads |
| `Dashboard.kanban.golden.tsx` | status tracking: sales pipeline, applicants, tickets |
| `Dashboard.calendar.golden.tsx` | time-axis work: scheduling, content calendar |
| `Dashboard.list-detail.golden.tsx` | content management / CRUD |
| `Dashboard.wizard.golden.tsx` | guided multi-step flows (intake, setup) |
| `Dashboard.map-overlay.golden.tsx` | location-centric apps |
| `Widget.golden.tsx` | the neutral base widget |
| `Widget.chart.golden.tsx` | a TREND at a glance (import `Sparkline` from `@/components/charts` — don't re-paste it) |
| `Widget.list.golden.tsx` | a short ranked/queue peek |
| `Widget.status.golden.tsx` | a state indicator |
| `Widget.single-metric.golden.tsx` | one number that matters |

## The domain → design matrix

Category matching is by substring (`sales-crm` hits `sales`). "Leads with" =
visible without scrolling on first run, and it must render a POLISHED empty /
connect-first state before any data exists (never an all-zero chart wall).

| Category | Landing page LEADS with | Dashboard golden | Widget archetype | Chart kit |
|---|---|---|---|---|
| `sales`, `gtm`, `revenue`, `crm`, `growth` | Charts first: `TrendLine` (pipeline/bookings over time) beside `BarList` (open value by stage/owner), THEN the work queue | `Dashboard.table` | `Widget.chart` | TrendLine + BarList + Sparkline |
| `finance`, `accounting`, `investing`, `billing` | KPI stat row (3–4 Stats with deltas) + one `TrendLine` (spend / revenue / balance) | `Dashboard.table` | `Widget.single-metric` or `Widget.chart` | TrendLine + Sparkline |
| `analytics`, `reporting`, `data` | Charts-first grid: 2+ `TrendLine`/`BarList` cards | `Dashboard.table` or `.list-detail` | `Widget.chart` | All three |
| `support`, `ops`, `operations`, `it` | Dense queue: status-count strip, then the table; `BarList` of backlog by status as the secondary panel | `Dashboard.table` | `Widget.list` or `Widget.status` | BarList (optional) |
| `marketing`, `content`, `social` | The schedule/pipeline: calendar or board; per-item engagement `Sparkline` | `Dashboard.calendar` or `.kanban` | `Widget.list` | Sparkline |
| `hr`, `recruiting`, `people` | Applicant/pipeline board or roster list-detail | `Dashboard.kanban` or `.list-detail` | `Widget.list` | BarList (funnel, optional) |
| `product`, `project`, `engineering` | Board or list-detail of work items with status chips | `Dashboard.kanban` / `.list-detail` | `Widget.status` | Sparkline (throughput, optional) |
| `legal`, `compliance` | Review queue with statuses; wizard for intake | `Dashboard.list-detail` / `.wizard` | `Widget.status` | — |
| `logistics`, `field`, `delivery`, `travel` | Map with live overlay + roster panel | `Dashboard.map-overlay` | `Widget.status` / `.single-metric` | — |
| anything else (exec, personal, default) | KPI row + digest of highlights | `Dashboard.golden` (base) | `Widget.single-metric` | Sparkline |

## Rules (they keep charts honest)

- **Data-heavy categories** (`sales`/`gtm`/`revenue`/`crm`/`growth`/`finance`/
  `accounting`/`investing`/`billing`/`analytics`/`reporting`/`data`/
  `marketing`/`ecommerce`) MUST render at least one `@/components/charts`
  component on the landing page — the identity gate warns otherwise.
- **One axis, one series per chart.** Compare via two chart cards, never a
  dual y-axis, never multi-hue series soup.
- **Chart color is `--chart-1` only** (defaults to the brand accent; override
  in `theme.css` when the accent is too light for hairline marks — see
  `.claude/design-tokens.md → Dataviz color`). Chart TEXT (values, labels,
  ticks) always wears text tokens, never the series color.
- **Every BarList/TrendLine keeps its table twin + tooltips** (they ship with
  ChartCard — don't strip them). Sparkline is the only chart allowed inside
  the fixed-frame Widget surface.
- **Status colors are never series colors** (and vice versa).
- **Progress vs the user's stated goals** (from AI onboarding) belongs on the
  landing page of any app that tracks targets — a same-ramp meter or a
  "x of N" stat, fed by the onboarding profile.

Record the chosen row as the **Primary visualization** deliverable in the
brainstorm's Design Output (→ `docs/plans/0001-brief.md`).
