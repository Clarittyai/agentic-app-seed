import { useState } from 'react';
import { Button } from '@clarittyai/app-ui';
import { openConnectPopup } from '@/lib/connect';

/**
 * The single reusable "Connect {name}" affordance. Opens the platform-hosted
 * connect popup (the app never touches a credential) and calls `onConnected`
 * when the user finishes — used by the first-run checklist AND inline
 * `*_not_connected` CTAs (retry the failed action on connect).
 *
 * Renders nothing when there's no `connectUrl` (bare local dev without a
 * platform app id) so a checklist row degrades to a plain "not connected" note.
 */
export function ConnectButton({
  integrationId,
  name,
  connectUrl,
  onConnected,
  variant,
  className,
}: {
  integrationId: string;
  name?: string;
  connectUrl?: string | null;
  onConnected?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  if (!connectUrl) return null;

  const label = name ? `Connect ${name}` : 'Connect';
  const start = () => {
    setBusy(true);
    openConnectPopup(connectUrl, {
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
      onClick={start}
    >
      {busy ? 'Connecting…' : label}
    </Button>
  );
}
