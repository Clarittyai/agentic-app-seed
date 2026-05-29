import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug,
  Mail,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ChevronDown,
  Copy,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listIntegrations,
  saveIntegrationCredentials,
  getIntegrationOAuthUrl,
  completeIntegrationOAuth,
  testIntegration,
  disconnectIntegration,
  type Integration,
  type IntegrationSetupStep,
} from '@/lib/api';

const ICONS: Record<string, typeof Plug> = { mail: Mail, sparkles: Sparkles };

type Msg = { kind: 'ok' | 'err'; text: string };

export default function IntegrationsSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [openGuide, setOpenGuide] = useState<Set<string>>(new Set());
  const [openHelp, setOpenHelp] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, Msg>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listIntegrations();
      setIntegrations(data);
    } catch {
      setMessages((m) => ({
        ...m,
        _global: { kind: 'err', text: 'Could not load integrations. Please retry.' },
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setMsg = (id: string, msg: Msg | null) =>
    setMessages((m) => {
      const next = { ...m };
      if (msg) next[id] = msg;
      else delete next[id];
      return next;
    });

  const setField = (id: string, key: string, val: string) =>
    setValues((v) => ({ ...v, [id]: { ...(v[id] || {}), [key]: val } }));

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const requiredFilled = (integ: Integration) =>
    integ.credentialFields.every((f) => (values[integ.id]?.[f.key] || '').trim().length > 0);

  const handleSave = async (integ: Integration) => {
    setBusy(integ.id);
    setMsg(integ.id, null);
    try {
      const updated = await saveIntegrationCredentials(integ.id, values[integ.id] || {});
      setIntegrations((list) => list.map((i) => (i.id === integ.id ? updated : i)));
      setMsg(integ.id, {
        kind: 'ok',
        text: integ.authKind === 'byo-oauth' ? 'Saved. Now click Connect.' : 'Connected.',
      });
    } catch (e: any) {
      setMsg(integ.id, { kind: 'err', text: e?.response?.data?.detail || 'Could not save.' });
    } finally {
      setBusy(null);
    }
  };

  const handleConnect = async (integ: Integration) => {
    setBusy(integ.id);
    setMsg(integ.id, null);
    try {
      // For OAuth, persist the client credentials first if the user just typed them.
      if (requiredFilled(integ) && !integ.status.connected) {
        const updated = await saveIntegrationCredentials(integ.id, values[integ.id] || {});
        setIntegrations((list) => list.map((i) => (i.id === integ.id ? updated : i)));
      }
      const { authUrl } = await getIntegrationOAuthUrl(integ.id);
      window.open(authUrl, 'claritty_oauth', 'width=520,height=660');

      const onMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || event.data.type !== 'claritty_oauth_callback') return;
        window.removeEventListener('message', onMessage);
        const { code, state, error } = event.data;
        if (error || !code || !state) {
          setMsg(integ.id, { kind: 'err', text: 'Connection cancelled.' });
          setBusy(null);
          return;
        }
        try {
          const updated = await completeIntegrationOAuth(integ.id, code, state);
          setIntegrations((list) => list.map((i) => (i.id === integ.id ? updated : i)));
          setMsg(integ.id, { kind: 'ok', text: 'Connected.' });
        } catch (e: any) {
          setMsg(integ.id, {
            kind: 'err',
            text: e?.response?.data?.detail || 'Could not finish connecting.',
          });
        } finally {
          setBusy(null);
        }
      };
      window.addEventListener('message', onMessage);
    } catch (e: any) {
      setMsg(integ.id, { kind: 'err', text: e?.response?.data?.detail || 'Could not start connect.' });
      setBusy(null);
    }
  };

  const handleTest = async (integ: Integration) => {
    setBusy(integ.id);
    setMsg(integ.id, null);
    try {
      const res = await testIntegration(integ.id);
      setMsg(integ.id, {
        kind: res.ok ? 'ok' : 'err',
        text: res.ok ? `Working${res.account ? ` (${res.account})` : ''}.` : res.detail || 'Test failed.',
      });
    } catch (e: any) {
      setMsg(integ.id, { kind: 'err', text: e?.response?.data?.detail || 'Test failed.' });
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async (integ: Integration) => {
    setBusy(integ.id);
    try {
      await disconnectIntegration(integ.id);
      setValues((v) => ({ ...v, [integ.id]: {} }));
      const data = await listIntegrations();
      setIntegrations(data);
      setMsg(integ.id, { kind: 'ok', text: 'Disconnected.' });
    } catch (e: any) {
      setMsg(integ.id, { kind: 'err', text: e?.response?.data?.detail || 'Could not disconnect.' });
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Plug className="h-6 w-6 text-accent" /> Integrations
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Connect the services this app needs. Each one tells you exactly where to get the
          values it asks for. Your credentials are encrypted and used only by this app.
        </p>
      </div>

      {messages._global && (
        <Banner msg={messages._global} />
      )}

      {integrations.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">This app doesn’t require any integrations.</p>
      )}

      <div className="space-y-5">
        {integrations.map((integ) => {
          const Icon = ICONS[integ.icon || ''] || Plug;
          const connected = integ.status.connected;
          const isBusy = busy === integ.id;
          const guideOpen = openGuide.has(integ.id);
          return (
            <motion.div
              key={integ.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {integ.name}
                      </h2>
                      <StatusBadge connected={connected} />
                    </div>
                    {integ.summary && (
                      <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{integ.summary}</p>
                    )}
                    {connected && integ.status.account && (
                      <p className="mt-1 text-xs text-gray-500">Account: {integ.status.account}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Overall setup guide */}
              {integ.setupGuide && integ.setupGuide.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => toggle(openGuide, integ.id, setOpenGuide)}
                    className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    <ChevronDown className={cn('h-4 w-4 transition-transform', guideOpen && 'rotate-180')} />
                    Setup guide
                  </button>
                  <AnimatePresence initial={false}>
                    {guideOpen && (
                      <motion.ol
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 space-y-2 overflow-hidden border-l-2 border-gray-100 dark:border-gray-800 pl-4"
                      >
                        {integ.setupGuide.map((s, i) => (
                          <Step key={i} index={i + 1} step={s} />
                        ))}
                      </motion.ol>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Redirect URI callout (OAuth) */}
              {integ.authKind === 'byo-oauth' && integ.redirectUri && (
                <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Authorized redirect URI (paste this into the provider when creating your OAuth client)
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 truncate text-xs text-gray-800 dark:text-gray-200">
                      {integ.redirectUri}
                    </code>
                    <button
                      onClick={() => copy(integ.redirectUri!, `${integ.id}:redirect`)}
                      className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Copy redirect URI"
                    >
                      {copied === `${integ.id}:redirect` ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Credential fields */}
              <div className="mt-4 space-y-4">
                {integ.credentialFields.map((field) => {
                  const helpKey = `${integ.id}:${field.key}`;
                  const helpOpen = openHelp.has(helpKey);
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}
                      </label>
                      {field.help && (
                        <p className="mt-0.5 text-xs text-gray-500">{field.help}</p>
                      )}
                      <input
                        type={field.secret ? 'password' : 'text'}
                        autoComplete="off"
                        placeholder={connected ? '•••••••• (saved — type to replace)' : `Enter ${field.label}`}
                        value={values[integ.id]?.[field.key] || ''}
                        onChange={(e) => setField(integ.id, field.key, e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                      />
                      {field.howToObtain && field.howToObtain.length > 0 && (
                        <div className="mt-1.5">
                          <button
                            onClick={() => toggle(openHelp, helpKey, setOpenHelp)}
                            className="text-xs font-medium text-accent hover:underline"
                          >
                            {helpOpen ? 'Hide steps' : 'How do I get this?'}
                          </button>
                          <AnimatePresence initial={false}>
                            {helpOpen && (
                              <motion.ol
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 space-y-1.5 overflow-hidden border-l-2 border-gray-100 dark:border-gray-800 pl-4"
                              >
                                {field.howToObtain.map((s, i) => (
                                  <Step key={i} index={i + 1} step={s} small />
                                ))}
                              </motion.ol>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Message */}
              {messages[integ.id] && (
                <div className="mt-4">
                  <Banner msg={messages[integ.id]} />
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {integ.authKind === 'byo-oauth' ? (
                  <>
                    <button
                      disabled={isBusy}
                      onClick={() => handleSave(integ)}
                      className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Save credentials
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => handleConnect(integ)}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? <RefreshCw className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                      {connected ? 'Reconnect' : 'Connect'}
                    </button>
                  </>
                ) : (
                  <button
                    disabled={isBusy}
                    onClick={() => handleSave(integ)}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {connected ? 'Update' : 'Save & connect'}
                  </button>
                )}

                {connected && (
                  <>
                    <button
                      disabled={isBusy}
                      onClick={() => handleTest(integ)}
                      className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Test
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => handleDisconnect(integ)}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Disconnect
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
      <CheckCircle2 className="h-3 w-3" /> Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
      Not connected
    </span>
  );
}

function Banner({ msg }: { msg: Msg }) {
  const ok = msg.kind === 'ok';
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl px-3 py-2 text-sm',
        ok
          ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
      )}
    >
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{msg.text}</span>
    </div>
  );
}

function Step({ index, step, small }: { index: number; step: IntegrationSetupStep; small?: boolean }) {
  return (
    <li className={cn('text-gray-700 dark:text-gray-300', small ? 'text-xs' : 'text-sm')}>
      <span className="font-medium text-gray-900 dark:text-white">{index}.</span> {step.step}
      {step.detail && <span className="text-gray-500"> — {step.detail}</span>}
      {step.url && (
        <a
          href={step.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 inline-flex items-center gap-0.5 text-accent hover:underline"
        >
          open <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </li>
  );
}
