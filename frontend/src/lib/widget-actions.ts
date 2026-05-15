/**
 * Widget Action Contract
 *
 * Standard way for a widget (rendered inside the Clarity marketplace iframe)
 * to declare interactive buttons. Two action types:
 *
 * 1. QUICK ACTION — calls the app's own backend API directly inside the
 *    widget iframe. No host involvement; widget updates itself in place.
 *
 * 2. DEEP LINK — posts a message to the parent host. The host catches it
 *    and opens its app modal (AppDialog) with the iframe pointed at the
 *    deep-link path, so the user sees the full app at that route without
 *    leaving the marketplace.
 *
 * Use the helpers below — do NOT call `window.parent.postMessage` directly.
 * See WIDGETS.md → "Widget Action Patterns" for the design rationale.
 */

export type WidgetActionMessage =
  | {
      type: 'WIDGET_ACTION';
      actionType: 'quick_action';
      actionId: string;
      source: string;
      timestamp: number;
    }
  | {
      type: 'WIDGET_ACTION';
      actionType: 'deep_link';
      path: string;
      source: string;
      timestamp: number;
    };

export interface QuickActionConfig<T> {
  actionId: string;
  run: () => Promise<T>;
  source?: string;
}

export interface DeepLinkConfig {
  path: string;
  source?: string;
}

/**
 * Resolve the widget's source slug. Apps can set `VITE_APP_SLUG` in their
 * env; if missing, fall back to the document title. Used as the `source`
 * field on every WIDGET_ACTION message for host-side analytics.
 */
export function getWidgetSource(): string {
  const fromEnv = (import.meta as any).env?.VITE_APP_SLUG;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  if (typeof document !== 'undefined' && document.title) return document.title;
  return 'unknown';
}

/**
 * Post a WIDGET_ACTION message to the parent host. No-op when the widget
 * is NOT inside an iframe (running standalone — e.g. local dev at /widget).
 */
export function postWidgetAction(message: WidgetActionMessage): void {
  if (typeof window === 'undefined') return;
  if (window.parent === window) return; // not embedded — silently skip
  window.parent.postMessage(message, '*');
}

/**
 * Trigger a deep link. Posts a message to the host, which opens the app
 * modal at the given path. Path is a relative URL on the app's own router
 * (e.g. '/?view=chart&coin=BTC' or '/settings').
 */
export function triggerDeepLink({ path, source }: DeepLinkConfig): void {
  postWidgetAction({
    type: 'WIDGET_ACTION',
    actionType: 'deep_link',
    path,
    source: source ?? getWidgetSource(),
    timestamp: Date.now(),
  });
}

/**
 * Run a quick action: execute the app's API call, then post an
 * analytics-only message to the host so it knows the action fired.
 * Errors propagate to the caller; the analytics message fires either
 * way so success/failure rates can be measured.
 */
export async function runQuickAction<T>({
  actionId,
  run,
  source,
}: QuickActionConfig<T>): Promise<T> {
  const resolvedSource = source ?? getWidgetSource();
  try {
    const result = await run();
    postWidgetAction({
      type: 'WIDGET_ACTION',
      actionType: 'quick_action',
      actionId,
      source: resolvedSource,
      timestamp: Date.now(),
    });
    return result;
  } catch (err) {
    postWidgetAction({
      type: 'WIDGET_ACTION',
      actionType: 'quick_action',
      actionId,
      source: resolvedSource,
      timestamp: Date.now(),
    });
    throw err;
  }
}
