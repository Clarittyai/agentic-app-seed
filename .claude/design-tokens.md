# Claritty Design Tokens — the system to build on, then make YOURS

The seed wires a semantic token system into `tailwind.config.js` + `src/index.css`.
**Use the semantic Tailwind tokens (never bare hex)** so light/dark + theming "just
work". Two rules that matter for making each app distinct:

- **Token NAMES are fixed** (the UI kit + widget-toolkit read them). Don't rename.
- **Token VALUES are YOURS.** The seed's indigo palette is a placeholder. Give your
  app its own look by overriding the brand values in **`frontend/src/theme.css`** —
  this is *required*, not optional (the identity gate checks it). See **IDENTITY.md**.

```css
/* frontend/src/theme.css — set these to YOUR palette + font (HSL channels) */
:root {
  --brand-accent: 268 84% 58%;      /* primary action / accent */
  --brand-accent-600: 268 84% 48%;  /* darker hover shade */
  --brand-primary: 240 6% 10%;      /* headings / strong text */
  --brand-font: 'Sora', system-ui, sans-serif;  /* load it in index.html */
}
```

`Widget.tsx`, `Dashboard.tsx`, and `Layout.tsx` are reference implementations of
the *patterns* — re-skin them for your brand, don't ship them as-is.

## Semantic tokens (use these, not raw colors)

| Use for | Token classes | Resolves to (light → dark) |
|---|---|---|
| Page background | `bg-background` / `text-foreground` | #FFFFFF / #1E293B → #0F0F10 / #F8FAFC |
| Cards, surfaces | `bg-card` `text-card-foreground` `border-border` | #FFFFFF → #1A1A1C (distinct from bg) |
| Brand / primary action | `bg-accent` `text-accent-foreground` `text-accent` | #5B7FFF (indigo), white text |
| Secondary text | `text-muted-foreground` | mid-gray |
| Subtle fills / chips | `bg-muted` (`bg-muted/40`, `bg-muted/20`) | light/dark gray |
| Success | `text-success` `bg-success/10` | #34C759 |
| Warning | `text-warning` `bg-warning/10` | #FF9500 |
| Destructive / danger | `text-destructive` `bg-destructive/10` | #EF4444 → #DC2626 |

Opacity utilities work on every token (`bg-accent/10`, `text-foreground/70`).

## Rules that keep it coherent (apply with YOUR palette)

- **No bare hex.** Always go through the tokens above so theming + dark mode hold.
- **No hover-scale.** Hover = a background-color transition (`transition-colors hover:bg-accent/90`, `hover:bg-muted`), never `hover:scale-*`. Entry/mount scale (framer-motion) is fine.
- **Radius:** default `rounded-lg` (8px); cards `rounded-xl`/`rounded-2xl`; widgets `rounded-3xl` (24px); pills `rounded-full`.
- **Spacing:** `p-4`/`gap-4` defaults; generous section spacing (`space-y-10`).
- **Touch targets ≥ 44px** (`h-11`) and **font ≥ 12px** (`text-xs`). iOS HIG.
- **Glass surfaces:** sticky bars use `bg-background/80 backdrop-blur-lg border-b border-border`.
- **Dark mode** is class-based (`<html class="dark">`) — tokens flip automatically; never hardcode `dark:bg-gray-900`.
- **Font:** the apple/Inter stack is wired via `--brand-font` (Tailwind `font-sans`).
- **iOS safe areas** on full-bleed mobile layouts: `pt-[env(safe-area-inset-top)]` / `pb-[env(safe-area-inset-bottom)]`.

## Surface & shape personality (make apps look *different*, not recolored)

Color + font alone make every app look like the seed in a new palette. The seed
also exposes **surface/shape personality tokens** so an app can have its own corner
language and surface treatment. Generation injects these into `theme.css` from the
design brief (corner language + surface style); you can set them by hand too. The
kit's `Card`/`Section`/`Stat` read them automatically through `tailwind.config.js`
(`rounded-xl`/`rounded-2xl`, `border`, `shadow-sm`), so changing them re-skins the
whole app — no kit changes.

```css
/* frontend/src/theme.css — optional; defaults reproduce the seed look */
:root {
  --ui-radius-xl: 1rem;      /* card/section radius (rounded-xl)  — sharp≈0.375rem … pill≈1.25rem */
  --ui-radius-2xl: 1.5rem;   /* card radius (rounded-2xl)         — sharp≈0.5rem  … pill≈1.75rem */
  --ui-border-width: 1px;    /* surface borders — set 0 for a flat, borderless look */
  --ui-shadow-card: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* card elevation — `none`, lift, or glass */
}
```

Pick a coherent set for the app's domain: a dense ops tool → sharp radius + flat
(`--ui-border-width: 0`, `--ui-shadow-card: none`); an editorial/wellness app →
rounded radius + soft lift. Keep ONE language across the app. **The widget's outer
radius (`rounded-3xl`) is canonical and intentionally NOT one of these** — it stays
fixed (the widget validator enforces it); express widget personality inside the
content, not on the outer tile.

## Dataviz color (`--chart-1`)

Charts (`frontend/src/components/charts` — BarList / TrendLine / Sparkline) draw
every MARK in one series hue: **`--chart-1`** (an HSL triple, consumed as
`hsl(var(--chart-1))`). It defaults to `var(--brand-accent)` in `index.css`, so
charts inherit the app's theme — light AND dark — with zero setup. Override it in
`theme.css` (both `:root` and `.dark`) only when the accent is too light or
desaturated to carry 2px lines and 20px bars against `bg-card`; pick a
chroma-bearing mid-lightness hue and check it against both surfaces.

Rules that keep charts honest:
- Chart **text never wears `--chart-1`** — values, labels, ticks, and legends stay
  `text-foreground` / `text-muted-foreground`; the colored mark beside them
  carries identity.
- **Status colors are never a series hue** (and vice versa).
- **One series per chart** — comparison is two chart cards, never a second axis.
- Which chart fits which domain: `docs/golden/INDEX.md` (the domain → design matrix).

## Widgets — three sizes only

Canonical dims live in `src/lib/widget-sizes.ts`. Small **170×170**, Medium
**360×170**, Large **360×360** — no others. Widgets are window-size invariant
(fixed px). Give each size a distinct, fully-filled layout (see `Widget.tsx`):
small = one metric, medium = a compact row/list, large = a rich multi-row list.

The widget is shown in an **iframe sized exactly to the widget**, so it has
**no box-shadow** and the host (`WidgetPage.tsx`) adds **no background, padding,
or margin** around it (it renders the bare widget under a transparent `widget-host`
body). The kit's internal content padding (`p-4`) and `rounded-3xl` tile stay.
See WIDGETS.md → "Exact-size iframe".
