/**
 * Seamless in-app integration connect. Opens the PLATFORM-HOSTED connect popup
 * (at app.claritty.ai) so the user connects in-context; this app NEVER handles a
 * credential — it only opens the deep link and listens for the "connected"
 * postMessage. Used by the first-run checklist and inline `*_not_connected` CTAs.
 *
 * The popup runs on a DIFFERENT origin than this app, so we validate incoming
 * messages against the platform origin (VITE_PLATFORM_APP_URL, default
 * https://app.claritty.ai) rather than same-origin.
 */

const PLATFORM_APP_ORIGIN = (() => {
  const raw =
    (import.meta.env.VITE_PLATFORM_APP_URL as string | undefined) ||
    'https://app.claritty.ai';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://app.claritty.ai';
  }
})();

const CONNECTED_MESSAGE = 'claritty:integration-connected';
const ERROR_MESSAGE = 'claritty:integration-error';

const POPUP_FEATURES =
  'width=520,height=720,menubar=no,toolbar=no,location=no,status=no';

export interface ConnectHandlers {
  /** When set, only fire callbacks for this integration id. */
  integrationId?: string;
  onConnected?: () => void;
  onError?: (reason?: string) => void;
  /** Fired when the popup is closed without a connected/error message. */
  onClosed?: () => void;
}

/**
 * Open the platform connect popup for `connectUrl` and resolve via the popup's
 * postMessage. If the popup is blocked, falls back to a full-page redirect with
 * a `return` param so the flow still completes (top-level, no postMessage).
 */
export function openConnectPopup(
  connectUrl: string,
  handlers: ConnectHandlers = {},
): void {
  const popup = window.open(connectUrl, 'claritty-connect', POPUP_FEATURES);
  if (!popup) {
    const sep = connectUrl.includes('?') ? '&' : '?';
    window.location.href = `${connectUrl}${sep}return=${encodeURIComponent(
      window.location.href,
    )}`;
    return;
  }

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== PLATFORM_APP_ORIGIN) return;
    const data = event.data as
      | { type?: string; integration?: string; reason?: string }
      | null;
    if (!data || typeof data.type !== 'string') return;
    if (
      handlers.integrationId &&
      data.integration &&
      data.integration !== handlers.integrationId
    ) {
      return;
    }
    if (data.type === CONNECTED_MESSAGE) {
      cleanup();
      handlers.onConnected?.();
    } else if (data.type === ERROR_MESSAGE) {
      cleanup();
      handlers.onError?.(data.reason);
    }
  };

  // Detect a manual close so callers can reset UI state.
  const poll = window.setInterval(() => {
    if (!popup || popup.closed) {
      cleanup();
      handlers.onClosed?.();
    }
  }, 800);

  function cleanup() {
    window.removeEventListener('message', onMessage);
    window.clearInterval(poll);
  }

  window.addEventListener('message', onMessage);
}
