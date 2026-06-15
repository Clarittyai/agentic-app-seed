import { useEffect, useState } from 'react';
import { Check, Plug, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Skeleton } from '@/components/ui';
import { getRequiredIntegrations, type IntegrationsStatus } from '@/lib/api';

/**
 * First-run setup checklist. Reads the app's REQUIRED integrations + per-user
 * connection status and tells the user what to connect to make the app work
 * (the missing piece behind "I approved a post but nothing happened").
 *
 * - `compact` (Dashboard banner): renders NOTHING when there's nothing required
 *   or everything is connected, so a finished/self-contained app stays clean.
 * - full (Integrations page): always renders the list, incl. an all-connected
 *   confirmation.
 *
 * Connecting an integration is a platform-owned OAuth flow (this app runs in the
 * Claritty iframe), so "Connect" asks the platform parent to open it.
 */
export default function SetupChecklist({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      getRequiredIntegrations()
        .then((s) => active && setStatus(s))
        .catch(() => active && setStatus({ integrations: [], all_connected: true }))
        .finally(() => active && setLoading(false));
    refresh();

    // The OAuth popup completes out-of-band (platform-owned). Re-poll when the
    // platform acks that a connect flow started, and when the window regains
    // focus (user returns from the consent popup), so the checklist updates.
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'claritty:connect-integration-started') refresh();
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('message', onMessage);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const connect = (integrationId: string) => {
    // Scope the connection to THIS app. The platform host also trusts its own
    // known appId, but we pass ours so per-app scoping holds in every context.
    const appId = status?.app_id;
    // Ask the Claritty platform (the iframe parent) to open the connect flow.
    try {
      window.parent?.postMessage(
        { type: 'claritty:connect-integration', integrationId, appId },
        '*',
      );
    } catch {
      /* no-op */
    }
    // Standalone (not iframed): deep-link to the app's canvas connect entrypoint
    // so the connection is scoped to this app — not the global settings page.
    if (window.parent === window) {
      const url = appId
        ? `https://app.claritty.ai/apps/${appId}?tab=intelligence&connect=${encodeURIComponent(integrationId)}`
        : 'https://app.claritty.ai/settings/integrations';
      window.open(url, '_blank', 'noopener');
    }
  };

  if (loading) {
    if (compact) return null;
    return <Skeleton className="h-28 w-full" />;
  }
  if (!status || status.integrations.length === 0) return null;
  // Compact banner: stay out of the way once everything's connected.
  if (compact && status.all_connected) return null;

  const remaining = status.integrations.filter((i) => !i.connected).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-muted-foreground" />
          {status.all_connected ? 'Connections' : 'Finish setup'}
        </CardTitle>
        <CardDescription>
          {status.all_connected
            ? 'Everything this app needs is connected.'
            : `Connect ${remaining} service${remaining === 1 ? '' : 's'} so this app can do its job.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {status.integrations.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground">{i.name}</span>
              {i.connected ? (
                <Badge tone="success">
                  <Check className="mr-1 h-3 w-3" /> Connected
                </Badge>
              ) : (
                <Badge tone="neutral">Not connected</Badge>
              )}
            </div>
            {!i.connected && (
              <Button variant="secondary" size="sm" onClick={() => connect(i.id)}>
                Connect <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
