/**
 * Host integration bridge — the EMBEDDED connect path.
 *
 * When this app runs inside the Claritty platform (AppDialog / ProxyAppIframe /
 * DeployedAppPreview), the host mounts `use-connect-integration-bridge`, which
 * listens for these messages from the app iframe and runs the whole connect
 * flow itself (OAuth popup or key dialog — the credential never touches the
 * app). The host acks back into the iframe so the UI can flip status:
 *
 *   app → host : { type: 'claritty:connect-integration',    integrationId, appId? }
 *   app → host : { type: 'claritty:disconnect-integration', integrationId, appId? }
 *   host → app : { type: 'claritty:connect-integration-started',  integrationId }
 *   host → app : { type: 'claritty:connect-integration-done',     integrationId }
 *   host → app : { type: 'claritty:disconnect-integration-done',  integrationId }
 *
 * Standalone (own tab), `lib/connect.ts`'s platform popup is the path instead;
 * bare local dev has neither — callers show "Open this app on Claritty".
 */

const CONNECT = 'claritty:connect-integration';
const DISCONNECT = 'claritty:disconnect-integration';
const CONNECT_STARTED = 'claritty:connect-integration-started';
const CONNECT_DONE = 'claritty:connect-integration-done';
const DISCONNECT_DONE = 'claritty:disconnect-integration-done';

/** True when the app renders inside the platform iframe/panel. A cross-origin
 * access throw also means embedded. */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function post(type: string, integrationId: string, appId?: string | null): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage(
    { type, integrationId, ...(appId ? { appId } : {}) },
    '*',
  );
}

/** Ask the host to run the connect flow for `integrationId`. Always pass the
 * appId (from GET /api/integrations/required) — some host surfaces have no app
 * context of their own and rely on it. */
export function requestConnectViaHost(
  integrationId: string,
  appId?: string | null,
): void {
  post(CONNECT, integrationId, appId);
}

export function requestDisconnectViaHost(
  integrationId: string,
  appId?: string | null,
): void {
  post(DISCONNECT, integrationId, appId);
}

export interface BridgeAck {
  kind: 'started' | 'connect-done' | 'disconnect-done';
  integrationId: string;
}

/**
 * Subscribe to the host's acks. Trust check is `event.source === window.parent`
 * — the host posts with targetOrigin '*', so ORIGIN is not the signal; the
 * sender window is. Returns an unsubscribe function.
 */
export function subscribeBridgeAcks(handler: (ack: BridgeAck) => void): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    const data = event.data as { type?: string; integrationId?: string } | null;
    if (!data || typeof data.type !== 'string' || typeof data.integrationId !== 'string') {
      return;
    }
    if (data.type === CONNECT_STARTED) {
      handler({ kind: 'started', integrationId: data.integrationId });
    } else if (data.type === CONNECT_DONE) {
      handler({ kind: 'connect-done', integrationId: data.integrationId });
    } else if (data.type === DISCONNECT_DONE) {
      handler({ kind: 'disconnect-done', integrationId: data.integrationId });
    }
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
