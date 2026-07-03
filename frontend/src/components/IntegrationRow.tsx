import { Button } from '@clarittyai/app-ui';
import { cn } from '@/lib/utils';
import type { RequiredIntegration } from '@/lib/api';
import { ConnectButton } from './ConnectButton';
import { isEmbedded } from '@/lib/integration-bridge';

/**
 * One integration on the Settings page: status dot + name, and the right
 * broker-only affordance for its state:
 * - not connected → <ConnectButton> (bridge when embedded, popup standalone),
 *   or a "Open this app on Claritty to connect" note in bare local dev.
 * - connected → "Connected" + Disconnect (embedded only — disconnect runs
 *   through the host bridge; standalone has no broker-only disconnect path).
 */
export function IntegrationRow({
  integration,
  appId,
  pending,
  onDisconnect,
  onRefresh,
}: {
  integration: RequiredIntegration;
  appId?: string | null;
  pending?: 'connect' | 'disconnect';
  onDisconnect: (id: string) => void;
  onRefresh: () => void;
}) {
  const embedded = isEmbedded();
  const { id, name, connected, connect_url } = integration;
  const canConnect = embedded || !!connect_url;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'h-2.5 w-2.5 flex-shrink-0 rounded-full',
            connected ? 'bg-success' : 'border-2 border-border bg-transparent',
          )}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name || id}</p>
          <p className="text-xs text-muted-foreground">
            {connected ? 'Connected' : 'Not connected'}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {connected ? (
          embedded ? (
            <Button
              variant="secondary"
              disabled={pending === 'disconnect'}
              onClick={() => onDisconnect(id)}
            >
              {pending === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          ) : null
        ) : canConnect ? (
          <ConnectButton
            integrationId={id}
            name={name || id}
            connectUrl={connect_url}
            appId={appId}
            onConnected={onRefresh}
            variant="primary"
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            Open this app on Claritty to connect
          </span>
        )}
      </div>
    </div>
  );
}
