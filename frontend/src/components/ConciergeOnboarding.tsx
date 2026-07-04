import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import {
  getOnboarding,
  getOnboardingContext,
  getRequiredIntegrations,
  saveOnboarding,
  conciergeLine,
  toApiError,
  type OnboardingQuestion,
  type OnboardingStatus,
  type RequiredIntegration,
} from '@/lib/api';
import {
  buildScript,
  conciergeReducer,
  initialConciergeState,
  renderLine,
  type Bubble,
  type Persona,
} from '@/lib/concierge';
import { ConnectButton } from './ConnectButton';
import { isEmbedded } from '@/lib/integration-bridge';
import { notifyWidgetStateChanged } from '@/lib/widget-actions';
import { cn } from '@/lib/utils';

const SKIP_KEY = 'claritty_concierge_skipped_v1';
export const LEAD_HIGHLIGHT_KEY = 'claritty_lead_highlight_v1';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/**
 * The AI concierge — a conversational onboarding modal. The AI speaks (word-
 * fade), the user answers with chips / inline fields, integration connect is
 * woven into the chat, every line can reference the user's REAL data, and the
 * finale arranges the dashboard around what they said they want to see.
 * Brain: lib/concierge.ts (pure). Renders nothing when there's nothing to ask.
 */
export function ConciergeOnboarding() {
  const [visible, setVisible] = useState<boolean | null>(null); // null = probing
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [facts, setFacts] = useState<Record<string, unknown>>({});
  const [appId, setAppId] = useState<string | null>(null);
  const [state, dispatch] = useReducer(conciergeReducer, initialConciergeState);
  const [finaleError, setFinaleError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // ── boot: probe everything in parallel; degrade gracefully ────────────────
  useEffect(() => {
    let alive = true;
    let skipped = false;
    try {
      skipped = sessionStorage.getItem(SKIP_KEY) === '1';
    } catch {
      /* private mode */
    }
    if (skipped) {
      setVisible(false);
      return;
    }
    Promise.allSettled([getOnboarding(), getOnboardingContext(), getRequiredIntegrations()]).then(
      ([ob, ctx, integ]) => {
        if (!alive) return;
        if (ob.status !== 'fulfilled') {
          setVisible(false); // a setup surface must never crash the app
          return;
        }
        const s = ob.value;
        if (s.questions.length === 0 || s.completed) {
          setVisible(false);
          return;
        }
        const groundFacts =
          ctx.status === 'fulfilled' ? (ctx.value.facts ?? {}) : ({} as Record<string, unknown>);
        const integrations: RequiredIntegration[] =
          integ.status === 'fulfilled' ? integ.value.integrations : [];
        if (integ.status === 'fulfilled') setAppId(integ.value.app_id ?? null);
        setStatus(s);
        setFacts(groundFacts);

        const script = buildScript({
          questions: s.questions,
          persona: s.persona ?? null,
          finale: s.finale,
          ctx: groundFacts,
          integrations,
          embedded: isEmbedded(),
        });
        const resumed = Object.keys(s.answers ?? {}).length > 0;
        const intro = resumed
          ? ['Welcome back — picking up where we left off.']
          : introLines(s, groundFacts);
        dispatch({ type: 'READY', script, savedAnswers: s.answers ?? {}, intro });
        setVisible(true);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  // Autoscroll as the conversation grows.
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: 999999, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [state.transcript, state.pending, state.phase, reduceMotion]);

  const persona: Persona = status?.persona ?? { name: appNameFallback(), tagline: 'your copilot' };

  const skip = useCallback(() => {
    try {
      sessionStorage.setItem(SKIP_KEY, '1');
    } catch {
      /* ignore */
    }
    dispatch({ type: 'DISMISS' });
    setTimeout(() => setVisible(false), 250);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, skip]);

  // ── answer submission ──────────────────────────────────────────────────────
  const submitAnswer = (q: OnboardingQuestion, value: unknown, userText: string) => {
    const label =
      q.type === 'select'
        ? (q.options?.find((o) => o.value === value)?.label ?? String(value))
        : String(value);
    const ack = renderLine(q.ack, q.ack_fallback, 'Got it — {label}.', {
      value,
      label,
      persona,
      ctx: facts,
    });
    dispatch({ type: 'SUBMIT', key: q.key, value, userText, ack });
    // Incremental save — resumable; failures self-heal on the final save.
    saveOnboarding({ [q.key]: value }, { complete: false }).catch(() => undefined);
    // Live concierge voice — replaces the queued ack if it lands in time.
    conciergeLine({ step_key: q.key, value, label })
      .then((r) => {
        if (r?.text) dispatch({ type: 'ACK_TEXT', text: r.text });
      })
      .catch(() => undefined);
  };

  const skipQuestion = (q: OnboardingQuestion) => {
    dispatch({
      type: 'SUBMIT',
      key: q.key,
      value: '',
      userText: 'Skip',
      ack: 'No problem — you can set that any time in Settings.',
    });
  };

  // ── finale: definitive save + arrange ──────────────────────────────────────
  const currentStep = state.script[state.index];
  const finaleRan = useRef(false);
  const runFinalSave = useCallback(() => {
    const answers = Object.fromEntries(
      Object.entries(state.answers).filter(([, v]) => v !== '' && v !== undefined && v !== null),
    );
    setFinaleError(null);
    saveOnboarding(answers, { complete: true })
      .then(() => {
        try {
          sessionStorage.setItem(LEAD_HIGHLIGHT_KEY, '1');
        } catch {
          /* ignore */
        }
        notifyWidgetStateChanged();
      })
      .catch((err) => {
        setFinaleError(toApiError(err).message);
      });
  }, [state.answers]);

  useEffect(() => {
    if (state.phase !== 'finale' || finaleRan.current) return;
    finaleRan.current = true;
    runFinalSave();
  }, [state.phase, runFinalSave]);

  const finishFinale = () => {
    if (finaleError) return; // Retry affordance handles it
    window.dispatchEvent(new Event('claritty:onboarding-finished'));
    dispatch({ type: 'FINALE_DONE' });
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  const questionSteps = state.script.filter((s) => s.kind === 'question').length;
  const answeredCount = state.script
    .filter((s) => s.kind === 'question')
    .filter((s) => s.kind === 'question' && state.answers[s.question.key] !== undefined).length;

  return (
    <AnimatePresence>
      <motion.div
        key="concierge"
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        role="dialog"
        aria-modal="true"
        aria-label="Set up this app"
      >
        {/* Backdrop + accent aura */}
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(600px 420px at 50% 38%, hsl(var(--brand-accent) / 0.16), transparent 70%)',
          }}
        />

        <motion.div
          className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-card"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={spring}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Sparkles className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{persona.name}</p>
                {persona.tagline && (
                  <p className="truncate text-xs text-muted-foreground">{persona.tagline}</p>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <ProgressDots total={questionSteps} done={answeredCount} />
              <button
                type="button"
                onClick={skip}
                className="min-h-11 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Skip for now
              </button>
            </div>
          </div>

          {/* Transcript */}
          <div
            ref={transcriptRef}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto px-5 py-5"
          >
            {state.transcript.map((b) => (
              <BubbleView key={b.id} bubble={b} animate={false} />
            ))}
            {state.phase === 'speaking' &&
              state.pending.map((text, i) => (
                <SpeakingBubble
                  key={`p${state.index}-${i}-${text.slice(0, 12)}`}
                  text={text}
                  delay={i * 0.25}
                  reduceMotion={!!reduceMotion}
                  onDone={
                    i === state.pending.length - 1 ? () => dispatch({ type: 'SPOKEN' }) : undefined
                  }
                />
              ))}

            {/* Connect step */}
            {state.phase === 'connect' && currentStep?.kind === 'connect' && (
              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
                className="flex items-center gap-3 pl-1"
              >
                <ConnectButton
                  integrationId={currentStep.integration.id}
                  name={currentStep.integration.name || currentStep.integration.id}
                  connectUrl={currentStep.integration.connect_url}
                  appId={appId}
                  variant="primary"
                  onConnected={() =>
                    dispatch({
                      type: 'CONNECTED',
                      ack: 'Connected. I can work from your real data now.',
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SKIP_STEP',
                      ack: 'No problem — you can connect any time from Settings.',
                    })
                  }
                  className="min-h-11 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Skip
                </button>
              </motion.div>
            )}

            {/* Finale */}
            {state.phase === 'finale' && currentStep?.kind === 'finale' && (
              <FinaleChecks
                items={currentStep.items.map((t) =>
                  renderLine(t, undefined, t, {
                    persona,
                    ctx: facts,
                    value: state.answers['lead_view'],
                    label: leadLabel(status, state.answers['lead_view']),
                  }),
                )}
                error={finaleError}
                onRetry={runFinalSave}
                onDone={finishFinale}
                reduceMotion={!!reduceMotion}
              />
            )}
          </div>

          {/* Input dock */}
          {state.phase === 'input' && currentStep?.kind === 'question' && (
            <AnswerDock
              key={currentStep.question.key}
              question={currentStep.question}
              onSubmit={(value, text) => submitAnswer(currentStep.question, value, text)}
              onSkip={() => skipQuestion(currentStep.question)}
              reduceMotion={!!reduceMotion}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────

function appNameFallback(): string {
  return typeof document !== 'undefined' && document.title ? document.title : 'This app';
}

function introLines(s: OnboardingStatus, facts: Record<string, unknown>): string[] {
  const persona = s.persona ?? null;
  const authored = (s.intro ?? []).map((tpl, i) =>
    renderLine(tpl, s.intro_fallback?.[i] ?? s.intro_fallback?.[0], '', { persona, ctx: facts }),
  );
  const lines = authored.filter(Boolean);
  if (lines.length > 0) return lines;
  return [
    `Let's set up ${appNameFallback()}. A few quick answers tailor the AI to you — and decide what this dashboard puts front and center.`,
  ];
}

function leadLabel(s: OnboardingStatus | null, value: unknown): string {
  const q = s?.questions.find((x) => x.key === 'lead_view');
  return q?.options?.find((o) => o.value === value)?.label ?? 'your dashboard';
}

function BubbleView({ bubble, animate }: { bubble: Bubble; animate: boolean }) {
  const isAi = bubble.role === 'ai';
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isAi ? 'justify-start' : 'justify-end')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isAi
            ? 'rounded-tl-md bg-muted text-foreground'
            : 'rounded-tr-md bg-accent text-accent-foreground',
        )}
      >
        {bubble.text}
      </div>
    </motion.div>
  );
}

/** AI line revealing word-by-word after a brief typing indicator. */
function SpeakingBubble({
  text,
  delay,
  reduceMotion,
  onDone,
}: {
  text: string;
  delay: number;
  reduceMotion: boolean;
  onDone?: () => void;
}) {
  const [typing, setTyping] = useState(!reduceMotion);
  const words = useMemo(() => text.split(' '), [text]);
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  }, [onDone]);

  useEffect(() => {
    if (reduceMotion) {
      finish();
      return;
    }
    const t = window.setTimeout(() => setTyping(false), 450 + delay * 1000);
    return () => window.clearTimeout(t);
  }, [reduceMotion, delay, finish]);

  if (reduceMotion) {
    return <BubbleView bubble={{ id: 'r', role: 'ai', text }} animate={false} />;
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
        {typing ? (
          <TypingDots />
        ) : (
          <motion.span
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.028 } } }}
            onAnimationComplete={finish}
          >
            {words.map((w, i) => (
              <motion.span
                key={i}
                className="inline"
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              >
                {w}
                {i < words.length - 1 ? ' ' : ''}
              </motion.span>
            ))}
          </motion.span>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

function ProgressDots({ total, done }: { total: number; done: number }) {
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-1.5" aria-label={`${done} of ${total} answered`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i < done ? 'w-4 bg-accent' : 'w-1.5 bg-border',
          )}
        />
      ))}
    </div>
  );
}

/** Chips for selects; inline field with prefix/suffix for number/text. */
function AnswerDock({
  question,
  onSubmit,
  onSkip,
  reduceMotion,
}: {
  question: OnboardingQuestion;
  onSubmit: (value: unknown, userText: string) => void;
  onSkip: () => void;
  reduceMotion: boolean;
}) {
  const [raw, setRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submitField = () => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const value = question.type === 'number' ? Number(trimmed) : trimmed;
    if (question.type === 'number' && Number.isNaN(value as number)) return;
    const text = `${question.prefix ?? ''}${trimmed}${question.suffix ? ` ${question.suffix}` : ''}`;
    onSubmit(value, text);
  };

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="border-t border-border px-5 py-4"
    >
      {question.type === 'select' ? (
        <motion.div
          className="flex flex-wrap gap-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.05 } } }}
        >
          {(question.options ?? []).map((o) => (
            <motion.button
              key={o.value}
              type="button"
              variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
              onClick={() => onSubmit(o.value, o.label)}
              className="min-h-11 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-accent/10"
            >
              {o.label}
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex min-h-11 flex-1 items-center gap-1.5 rounded-full border border-border bg-background px-4 focus-within:border-accent/60">
            {question.prefix && (
              <span className="text-sm text-muted-foreground">{question.prefix}</span>
            )}
            <input
              ref={inputRef}
              type={question.type === 'number' ? 'number' : 'text'}
              value={raw}
              placeholder={question.placeholder}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitField()}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              aria-label={question.label}
            />
            {question.suffix && (
              <span className="flex-shrink-0 text-sm text-muted-foreground">{question.suffix}</span>
            )}
          </div>
          <button
            type="button"
            onClick={submitField}
            disabled={!raw.trim()}
            className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onSkip}
        className="mt-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Skip
      </button>
    </motion.div>
  );
}

function FinaleChecks({
  items,
  error,
  onRetry,
  onDone,
  reduceMotion,
}: {
  items: string[];
  error: string | null;
  onRetry: () => void;
  onDone: () => void;
  reduceMotion: boolean;
}) {
  const [shown, setShown] = useState(reduceMotion ? items.length : 0);

  useEffect(() => {
    if (reduceMotion) {
      const t = window.setTimeout(onDone, error ? 999999 : 600);
      return () => window.clearTimeout(t);
    }
    if (shown < items.length) {
      const t = window.setTimeout(() => setShown((n) => n + 1), 450);
      return () => window.clearTimeout(t);
    }
    if (!error) {
      const t = window.setTimeout(onDone, 500);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, items.length, reduceMotion, error]);

  return (
    <div className="space-y-3 py-2 pl-1">
      <p className="text-sm font-semibold text-foreground">Setting up your command center…</p>
      {items.slice(0, shown).map((item, i) => (
        <motion.div
          key={i}
          initial={reduceMotion ? undefined : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5"
        >
          <motion.span
            initial={reduceMotion ? undefined : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={spring}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success"
          >
            <Check className="h-3 w-3" />
          </motion.span>
          <span className="text-sm text-muted-foreground">{item}</span>
        </motion.div>
      ))}
      {error && (
        <div className="flex items-center gap-3 pt-1">
          <p className="text-sm font-medium text-foreground">Couldn’t save: {error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-lg px-2 text-sm font-medium text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
