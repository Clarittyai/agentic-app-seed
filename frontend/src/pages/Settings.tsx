import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Section, EmptyState, ErrorState, Button } from '@clarittyai/app-ui';
import {
  getRequiredIntegrations,
  toApiError,
  type IntegrationsStatus,
} from '@/lib/api';
import { IntegrationRow } from '@/components/IntegrationRow';
import { OnboardingForm } from '@/components/OnboardingFlow';
import { useToast } from '@/components/Toast';
import {
  requestDisconnectViaHost,
  subscribeBridgeAcks,
} from '@/lib/integration-bridge';

/**
 * Settings — the always-available management surface every app ships:
 * - Integrations: the app's declared integrations with per-user status and
 *   broker-only Connect/Disconnect (host bridge embedded, platform popup
 *   standalone; bare local dev shows "Open this app on Claritty").
 * - Preferences: the onboarding answers (goals/context that tailor the
 *   agents), editable any time.
 *
 * Credentials stay on Claritty — this app never sees them.
 */
export default function Settings() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, 'connect' | 'disconnect'>>({});
  const { show } = useToast();

  const load = useCallback(async () => {
    try {
      setStatus(await getRequiredIntegrations());
      setError(null);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    // Host acks flip status without waiting for the next focus/poll.
    const unsub = subscribeBridgeAcks((ack) => {
      if (ack.kind === 'connect-done' || ack.kind === 'disconnect-done') {
        setPending((p) => {
          const next = { ...p };
          delete next[ack.integrationId];
          return next;
        });
        void load();
      }
    });
    return () => {
      window.removeEventListener('focus', onFocus);
      unsub();
    };
  }, [load]);

  const handleDisconnect = (integrationId: string) => {
    setPending((p) => ({ ...p, [integrationId]: 'disconnect' }));
    try {
      requestDisconnectViaHost(integrationId, status?.app_id);
    } catch (err) {
      setPending((p) => {
        const next = { ...p };
        delete next[integrationId];
        return next;
      });
      show({ tone: 'error', text: `Couldn’t disconnect: ${toApiError(err).message}` });
    }
  };

  if (error) {
    return (
      <ErrorState
        title="Couldn’t load settings"
        description={error}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  const integrations = status?.integrations ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <PageHeader
        title="Settings"
        description="Connected accounts and the preferences that tailor this app to you."
      />

      <Section
        title="Integrations"
        description="Accounts this app works with. Connecting runs on Claritty — credentials never touch this app."
      >
        {status === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : integrations.length === 0 ? (
          <EmptyState
            title="Self-contained app"
            description="This app doesn’t use any external accounts — nothing to connect."
          />
        ) : (
          <div className="space-y-2">
            {integrations.map((integration) => (
              <IntegrationRow
                key={integration.id}
                integration={integration}
                appId={status.app_id}
                pending={pending[integration.id]}
                onDisconnect={handleDisconnect}
                onRefresh={() => void load()}
              />
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Credentials stay on Claritty — this app never sees them.
        </p>
      </Section>

      <Section
        title="Preferences"
        description="Your goals and context — the agents use these to tailor what they do for you."
      >
        <OnboardingForm variant="settings" />
      </Section>
    </div>
  );
}
