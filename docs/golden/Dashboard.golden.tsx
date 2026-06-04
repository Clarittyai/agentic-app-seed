/**
 * GOLDEN REFERENCE — not built, not imported (lives outside src/, suffix
 * `.golden.tsx` so tsc/vite ignore it). It shows the BAR for a generated
 * `frontend/src/pages/Dashboard.tsx`: match this hierarchy, spacing, state
 * handling, and restraint — then ADAPT the domain/content to the real app.
 * Do NOT copy this content.
 *
 * Why it's good:
 *  - ONE strong header stating the app's purpose (real {appName}, one-line value
 *    prop) — no "Welcome to…", no hero blob, no decorative icon glued to the h1.
 *  - Opens on the real work (the queue), not a marketing pitch. Exactly ONE
 *    primary action; everything else is quiet/secondary.
 *  - Theme TOKENS only (text-foreground / text-muted-foreground / text-accent /
 *    bg-card / border) — zero hardcoded hex, full dark-mode parity.
 *  - 8pt rhythm, constrained reading width, mobile-first (single column →
 *    grid at md). All three states handled: skeleton, friendly empty, inline
 *    error with retry — never a blank screen or a raw spinner.
 *  - lucide icons only where they aid scanning (buttons/rows), sentence case,
 *    concise domain copy.
 */
import { useEffect, useState } from 'react';
import { Plus, BookOpen, RefreshCw } from 'lucide-react';
import { appName } from '@/lib/app-meta';
import { getQueue, addItem, type QueueItem } from '@/lib/api';

export default function Dashboard() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await getQueue());
      setError(null);
    } catch {
      setError('Could not load your queue');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Header — purpose, not a pitch. One primary action. */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{appName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything you saved to read, in one calm queue.</p>
        </div>
        <button
          onClick={() => void addItem().then(load)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add link
        </button>
      </header>

      {/* Error — inline, legible, retryable. */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{error}</p>
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Loading — skeleton, not a spinner. */}
      {items === null && !error && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {/* Empty — short line + the primary action, centered. */}
      {items?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing in your queue yet.</p>
          <button
            onClick={() => void addItem().then(load)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add your first link
          </button>
        </div>
      )}

      {/* Content — left-aligned cards, quiet metadata. */}
      {items && items.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="truncate text-sm font-semibold text-foreground">{it.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{it.source}</p>
              <p className="mt-3 text-xs text-muted-foreground">added {it.added_at}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
