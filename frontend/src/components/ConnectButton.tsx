import { useEffect, useRef, useState } from 'react';
import { Button } from '@clarittyai/app-ui';
import { openConnectPopup } from '@/lib/connect';
import {
  isEmbedded,
  requestConnectViaHost,
  subscribeBridgeAcks,
} from '@/lib/integration-bridge';

/**
 * The single reusable "Connect {name}" affordance — broker-only, three modes:
 *
 * 1. EMBEDDED in the platform → post `claritty:connect-integration` to the
 *    host bridge; the host runs OAuth / the key dialog and acks `-done`.
 * 2. STANDALONE with a platform `connectUrl` → open the platform-hosted
 *    connect popup (lib/connect.ts). The app never touches a credential.
 * 3. BARE LOCAL (no platform at all) → renders nothing; the caller shows
 *    "Open this app on Claritty to connect."
 */
export function ConnectButton({
  integrationId,
  name,
  connectUrl,
  appId,
  onConnected,
  variant,
  className,
}: {
  integrationId: string;
  name?: string;
  connectUrl?: string | null;
  /** This app's id (from GET /api/integrations/required) — scopes the host
   *  bridge flow to this app. */
  appId?: string | null;
  onConnected?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const unsubRef = useRef<null | (() => void)>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      unsubRef.current?.();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const embedded = isEmbedded();
  if (!connectUrl && !embedded) return null;

  const label = name ? `Connect ${name}` : 'Connect';

  const settle = () => {
    unsubRef.current?.();
    unsubRef.current = null;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setBusy(false);
  };

  const startViaBridge = () => {
    setBusy(true);
    unsubRef.current = subscribeBridgeAcks((ack) => {
      if (ack.integrationId !== integrationId) return;
      if (ack.kind === 'connect-done') {
        settle();
        onConnected?.();
      }
    });
    // A dismissed host dialog sends no ack — don't wedge the button forever.
    timerRef.current = window.setTimeout(settle, 120_000);
    requestConnectViaHost(integrationId, appId);
  };

  const startViaPopup = () => {
    setBusy(true);
    openConnectPopup(connectUrl as string, {
      integrationId,
      onConnected: () => {
        setBusy(false);
        onConnected?.();
      },
      onError: () => setBusy(false),
      onClosed: () => setBusy(false),
    });
  };

  return (
    <Button
      variant={variant}
      className={className}
      disabled={busy}
      onClick={embedded ? startViaBridge : startViaPopup}
    >
      {busy ? 'Connecting…' : label}
    </Button>
  );
}
