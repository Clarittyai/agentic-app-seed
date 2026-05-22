import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import Widget from '@/components/Widget';
import { appName, appDescription } from '@/lib/app-meta';
import { getWidgetData, type WidgetData } from '@/lib/api';

/**
 * Generic, on-brand dashboard reference. Generation customizes this per app —
 * keep it branded to {appName} (never a hardcoded product name), themed via the
 * app's tokens (text-accent / bg-card / text-muted-foreground / border, NOT
 * hardcoded hex), mobile-first, and with real loading / empty / error states.
 */
export default function Dashboard() {
  const [data, setData] = useState<WidgetData | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  );

  const load = async () => {
    setStatus('loading');
    try {
      setData(await getWidgetData('large'));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-10 sm:space-y-14">
      {/* Hero — branded to the app's own name + description */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 shadow-sm">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-muted-foreground">
            {appName}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {appName}
        </h1>
        {appDescription && (
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {appDescription}
          </p>
        )}
        <div className="mt-8 flex justify-center sm:mt-10">
          <Widget size="large" />
        </div>
      </motion.section>

      {/* Overview — demonstrates the mandatory loading / error / ready states */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Overview</h2>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {status === 'loading' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm">
            <AlertCircle className="h-6 w-6 text-accent" />
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load your data right now.
            </p>
            <button
              onClick={() => void load()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-transform active:scale-95"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Active" value={String(data?.active_triggers ?? 0)} />
            <StatCard
              label="Total runs"
              value={String(data?.total_executions ?? 0)}
            />
            <StatCard
              label="Success rate"
              value={
                data?.success_rate != null
                  ? `${Math.round(data.success_rate)}%`
                  : '—'
              }
            />
          </div>
        )}
      </motion.section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Activity className="h-4 w-4 text-accent" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
