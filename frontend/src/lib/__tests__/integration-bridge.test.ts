import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isEmbedded,
  requestConnectViaHost,
  requestDisconnectViaHost,
  subscribeBridgeAcks,
} from '../integration-bridge';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isEmbedded', () => {
  it('is false at the top window (jsdom default)', () => {
    expect(isEmbedded()).toBe(false);
  });
});

describe('request messages', () => {
  it('posts the exact connect message shape to the parent', () => {
    const spy = vi.spyOn(window.parent, 'postMessage');
    // jsdom: window.parent === window, so the guard would no-op. Simulate an
    // embedded frame by patching the guard's comparison target.
    const original = Object.getOwnPropertyDescriptor(window, 'parent');
    const fakeParent = { postMessage: vi.fn() } as unknown as Window;
    Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
    try {
      requestConnectViaHost('salesforce', 'app-123');
      expect(fakeParent.postMessage).toHaveBeenCalledWith(
        { type: 'claritty:connect-integration', integrationId: 'salesforce', appId: 'app-123' },
        '*',
      );
      requestDisconnectViaHost('salesforce');
      expect(fakeParent.postMessage).toHaveBeenCalledWith(
        { type: 'claritty:disconnect-integration', integrationId: 'salesforce' },
        '*',
      );
    } finally {
      if (original) Object.defineProperty(window, 'parent', original);
      spy.mockRestore();
    }
  });
});

describe('subscribeBridgeAcks', () => {
  it('maps the three ack types and ignores messages not from the parent', () => {
    const acks: unknown[] = [];
    const unsub = subscribeBridgeAcks((a) => acks.push(a));

    const fire = (data: unknown, source: unknown) => {
      const ev = new MessageEvent('message', { data });
      Object.defineProperty(ev, 'source', { value: source });
      window.dispatchEvent(ev);
    };

    // jsdom top window: window.parent === window, so `window` IS the parent.
    fire({ type: 'claritty:connect-integration-started', integrationId: 'x' }, window);
    fire({ type: 'claritty:connect-integration-done', integrationId: 'x' }, window);
    fire({ type: 'claritty:disconnect-integration-done', integrationId: 'x' }, window);
    // wrong source → dropped
    fire({ type: 'claritty:connect-integration-done', integrationId: 'y' }, null);
    // malformed → dropped
    fire({ type: 'claritty:connect-integration-done' }, window);

    unsub();
    fire({ type: 'claritty:connect-integration-done', integrationId: 'z' }, window);

    expect(acks).toEqual([
      { kind: 'started', integrationId: 'x' },
      { kind: 'connect-done', integrationId: 'x' },
      { kind: 'disconnect-done', integrationId: 'x' },
    ]);
  });
});
