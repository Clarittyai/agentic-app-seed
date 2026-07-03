import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plug, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getRequiredIntegrations, type RequiredIntegration } from '@/lib/api';
import { isEmbedded } from '@/lib/integration-bridge';
import { ConnectButton } from './ConnectButton';

const DISMISS_KEY = 'claritty_integrations_checklist_dismissed_v1';

/**
 * First-run setup checklist: the integrations this app declares, with a one-tap
 * Connect for each unconnected one (opens the platform-hosted connect popup —
 * the app never handles a credential). Hides itself once everything is
 * connected, when the app declares none, or in bare local dev where no connect
 * link is available. Re-probes on connect and on window focus.
 */
export function IntegrationsChecklist() {
  const [items, setItems] = useState<RequiredIntegration[] | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [allConnected, setAllConnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getRequiredIntegrations();
      setItems(res.integrations);
      setAppId(res.app_id ?? null);
      setAllConnected(res.all_connected);
    } catch {
      // A setup hint must never crash the app — degrade to hidden.
      setItems([]);
    }
  }, []);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      /* private mode — treat as not dismissed */
    }
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (!items || allConnected || dismissed) return null;
  const unconnected = items.filter((i) => !i.connected);
  if (unconnected.length === 0) return null;
  // Nothing actionable (bare local dev without a platform connect link).
  // Embedded, the host bridge makes every row actionable regardless.
  if (!unconnected.some((i) => !!i.connect_url) && !isEmbedded()) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Plug className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Finish setup</p>
            <p className="text-xs text-muted-foreground">
              Connect these to unlock everything this app can do. Your
              credentials stay on Claritty — this app never sees them.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
              {it.connected ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
              ) : (
                <span className="h-4 w-4 flex-shrink-0 rounded-full border border-border" />
              )}
              <span className="truncate">{it.name}</span>
            </span>
            {it.connected ? (
              <span className="flex-shrink-0 text-xs font-medium text-success">
                Connected
              </span>
            ) : (
              <ConnectButton
                integrationId={it.id}
                name={it.name}
                connectUrl={it.connect_url}
                appId={appId}
                variant="secondary"
                onConnected={() => void load()}
              />
            )}
          </li>
        ))}
      </ul>
      <Link
        to="/settings"
        className="mt-3 inline-block text-xs font-medium text-accent hover:underline"
      >
        Manage integrations in Settings →
      </Link>
    </div>
  );
}
