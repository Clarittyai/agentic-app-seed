# Claritty Design Tokens — build on-brand by default

Mirror of the platform design system (clarity-platform `DESIGN_SYSTEM.md` /
`globals.css`). The seed already wires these into `tailwind.config.js` +
`src/index.css`. **Use the semantic Tailwind tokens below — never bare hex** —
so light/dark + per-app theming "just work". `Widget.tsx`, `Dashboard.tsx`, and
`Layout.tsx` are the canonical reference implementations.

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

## Rules that make it look "Claritty"

- **No bare hex.** Always go through the tokens above so theming + dark mode hold.
- **No hover-scale.** Hover = a background-color transition (`transition-colors hover:bg-accent/90`, `hover:bg-muted`), never `hover:scale-*`. Entry/mount scale (framer-motion) is fine.
- **Radius:** default `rounded-lg` (8px); cards `rounded-xl`/`rounded-2xl`; widgets `rounded-3xl` (24px); pills `rounded-full`.
- **Spacing:** `p-4`/`gap-4` defaults; generous section spacing (`space-y-10`).
- **Touch targets ≥ 44px** (`h-11`) and **font ≥ 12px** (`text-xs`). iOS HIG.
- **Glass surfaces:** sticky bars use `bg-background/80 backdrop-blur-lg border-b border-border`.
- **Dark mode** is class-based (`<html class="dark">`) — tokens flip automatically; never hardcode `dark:bg-gray-900`.
- **Font:** the apple/Inter stack is wired via `--brand-font` (Tailwind `font-sans`).
- **iOS safe areas** on full-bleed mobile layouts: `pt-[env(safe-area-inset-top)]` / `pb-[env(safe-area-inset-bottom)]`.

## Widgets — three sizes only

Canonical dims live in `src/lib/widget-sizes.ts`. Small **170×170**, Medium
**360×170**, Large **360×360** — no others. Widgets are window-size invariant
(fixed px). Give each size a distinct, fully-filled layout (see `Widget.tsx`):
small = one metric, medium = a compact row/list, large = a rich multi-row list.
