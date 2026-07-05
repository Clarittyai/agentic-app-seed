/**
 * The concierge brain — pure, DOM-free, fully unit-testable.
 *
 * The AI-onboarding modal (components/ConciergeOnboarding.tsx) is a thin
 * renderer over this: buildScript() turns the app-authored onboarding block
 * (app-config.json) + live grounding facts + integration status into an
 * ordered conversation; renderTemplate() interpolates the copy; and
 * conciergeReducer() is the step machine. All side effects (fetches, saves,
 * sessionStorage, motion) live in the component.
 */
import type { OnboardingQuestion, RequiredIntegration } from '@/lib/api';
import { appName } from '@/lib/app-meta';

export interface Persona {
  name: string;
  tagline?: string;
}

export type ConciergeStep =
  | { kind: 'connect'; integration: RequiredIntegration; ask: string[] }
  | {
      kind: 'question';
      question: OnboardingQuestion;
      ask: string[];
      ack: string;
      ackFallback?: string;
    }
  | { kind: 'finale'; items: string[] };

export interface Bubble {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

export type Phase =
  | 'loading'
  | 'speaking' // AI lines revealing one at a time
  | 'thinking' // waiting for the (possibly live) ack — one dots bubble
  | 'connect'
  | 'input'
  | 'finale'
  | 'closed';

export interface ConciergeState {
  script: ConciergeStep[];
  index: number;
  phase: Phase;
  transcript: Bubble[];
  /** AI lines queued for the current speak beat. */
  pending: string[];
  answers: Record<string, unknown>;
}

export type ConciergeEvent =
  | {
      type: 'READY';
      script: ConciergeStep[];
      savedAnswers: Record<string, unknown>;
      intro: string[];
      /** Replayed prior turns (resume): the FULL chat so far, as bubbles. */
      history?: { role: 'ai' | 'user'; text: string }[];
    }
  | { type: 'SPOKEN' }
  /** User answered: bubble + answer recorded, step advances, AI 'thinks'. */
  | { type: 'SUBMIT'; key: string; value: unknown; userText: string }
  /** Connect done / step skipped: advance + think (no user bubble). */
  | { type: 'ADVANCE' }
  /** The AI's next lines are settled (live or template) — speak them. */
  | { type: 'AI_LINES'; lines: string[] }
  | { type: 'FINALE_DONE' }
  | { type: 'DISMISS' };

let bubbleSeq = 0;
const bubble = (role: Bubble['role'], text: string): Bubble => ({
  id: `b${bubbleSeq++}`,
  role,
  text,
});

// ── Template renderer (mirror of backend/shared/onboarding.py) ──────────────

export function renderTemplate(
  tpl: string,
  vars: {
    value?: unknown;
    label?: unknown;
    persona?: Persona | null;
    ctx?: Record<string, unknown>;
  },
): { text: string; resolved: boolean } {
  let out = String(tpl ?? '');
  const pairs: [string, unknown][] = [
    ['{value}', vars.value],
    ['{label}', vars.label],
    ['{persona.name}', vars.persona?.name],
    ['{persona.tagline}', vars.persona?.tagline],
    ['{appName}', appName],
  ];
  for (const [token, val] of pairs) {
    if (val !== undefined && val !== null) out = out.split(token).join(String(val));
  }
  out = out.replace(/\{ctx\.([A-Za-z0-9_.]+)\}/g, (match, path: string) => {
    let node: unknown = vars.ctx ?? {};
    for (const part of path.split('.')) {
      if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return match;
      }
    }
    return String(node);
  });
  const resolved = !/\{[A-Za-z_]/.test(out);
  return { text: out, resolved };
}

/** Render with fallback chain: template → fallback template → generic. */
export function renderLine(
  tpl: string | undefined,
  fallbackTpl: string | undefined,
  generic: string,
  vars: Parameters<typeof renderTemplate>[1],
): string {
  if (tpl) {
    const r = renderTemplate(tpl, vars);
    if (r.resolved) return r.text;
  }
  if (fallbackTpl) {
    const r = renderTemplate(fallbackTpl, vars);
    if (r.resolved) return r.text;
  }
  return renderTemplate(generic, vars).text;
}

// ── Script builder ───────────────────────────────────────────────────────────

export function buildScript(args: {
  questions: OnboardingQuestion[];
  persona?: Persona | null;
  finale?: string[];
  ctx: Record<string, unknown>;
  integrations: RequiredIntegration[];
  embedded: boolean;
}): ConciergeStep[] {
  const steps: ConciergeStep[] = [];

  // Connect woven into the conversation — same actionability rule as the
  // checklist: an unconnected integration we can actually act on here.
  const connectable = args.integrations.find(
    (i) => !i.connected && (!!i.connect_url || args.embedded),
  );
  if (connectable) {
    steps.push({
      kind: 'connect',
      integration: connectable,
      ask: [
        `First — let's plug into ${connectable.name || connectable.id} so I can work from your real data. Everything stays on Claritty; I never see a credential.`,
      ],
    });
  }

  for (const q of args.questions) {
    const ask = q.ask
      ? [renderLine(q.ask, undefined, q.label, { persona: args.persona, ctx: args.ctx })]
      : [q.label, ...(q.help ? [q.help] : [])];
    steps.push({
      kind: 'question',
      question: q,
      ask,
      ack: q.ack || 'Got it — {label}.',
      ackFallback: q.ack_fallback,
    });
  }

  steps.push({
    kind: 'finale',
    items:
      args.finale && args.finale.length > 0
        ? args.finale
        : ['Saving your preferences', 'Tuning the AI to your goals', 'Opening your dashboard'],
  });

  return steps;
}

/** First step the user still needs to act on (resume support). */
export function firstOpenStep(
  script: ConciergeStep[],
  savedAnswers: Record<string, unknown>,
): number {
  for (let i = 0; i < script.length; i++) {
    const s = script[i];
    if (s.kind === 'connect' && !s.integration.connected) return i;
    if (s.kind === 'question') {
      const saved = savedAnswers[s.question.key];
      if (saved === undefined || saved === null || saved === '') return i;
    }
    if (s.kind === 'finale') return i;
  }
  return script.length - 1;
}

/** Replay the FULL conversation for already-answered steps (resume): each
 * answered question's ask lines, the user's answer bubble, and the rendered
 * ack — so a returning user sees the whole chat, not a summary. */
export function replayHistory(
  script: ConciergeStep[],
  savedAnswers: Record<string, unknown>,
  vars: { persona?: Persona | null; ctx?: Record<string, unknown> },
): { role: 'ai' | 'user'; text: string }[] {
  const out: { role: 'ai' | 'user'; text: string }[] = [];
  const stop = firstOpenStep(script, savedAnswers);
  for (let i = 0; i < stop; i++) {
    const step = script[i];
    if (step.kind !== 'question') continue;
    const value = savedAnswers[step.question.key];
    if (value === undefined || value === null || value === '') continue;
    const label =
      step.question.type === 'select'
        ? (step.question.options?.find((o) => o.value === value)?.label ?? String(value))
        : String(value);
    for (const line of step.ask) out.push({ role: 'ai', text: line });
    out.push({
      role: 'user',
      text:
        step.question.type === 'select'
          ? label
          : `${step.question.prefix ?? ''}${value}${step.question.suffix ? ` ${step.question.suffix}` : ''}`,
    });
    out.push({
      role: 'ai',
      text: renderLine(step.ack, step.ackFallback, 'Got it — {label}.', {
        value,
        label,
        persona: vars.persona,
        ctx: vars.ctx,
      }),
    });
  }
  return out;
}

// ── Reducer ──────────────────────────────────────────────────────────────────

export const initialConciergeState: ConciergeState = {
  script: [],
  index: 0,
  phase: 'loading',
  transcript: [],
  pending: [],
  answers: {},
};

export function conciergeReducer(
  state: ConciergeState,
  event: ConciergeEvent,
): ConciergeState {
  switch (event.type) {
    case 'READY': {
      const index = firstOpenStep(event.script, event.savedAnswers);
      return {
        ...state,
        script: event.script,
        answers: { ...event.savedAnswers },
        index,
        transcript: (event.history ?? []).map((h) => bubble(h.role, h.text)),
        pending: [...event.intro, ...askLines(event.script[index])],
        phase: 'speaking',
      };
    }

    case 'SPOKEN': {
      const spoken = state.pending.map((t) => bubble('ai', t));
      const step = state.script[state.index];
      const phase: Phase =
        step?.kind === 'connect' ? 'connect' : step?.kind === 'finale' ? 'finale' : 'input';
      return {
        ...state,
        transcript: [...state.transcript, ...spoken],
        pending: [],
        phase,
      };
    }

    case 'SUBMIT': {
      return {
        ...state,
        answers: { ...state.answers, [event.key]: event.value },
        transcript: [...state.transcript, bubble('user', event.userText)],
        index: state.index + 1,
        pending: [],
        phase: 'thinking',
      };
    }

    case 'ADVANCE': {
      return { ...state, index: state.index + 1, pending: [], phase: 'thinking' };
    }

    case 'AI_LINES': {
      if (event.lines.length === 0) {
        // Nothing to say (e.g. straight into the finale card) — behave as spoken.
        const step = state.script[state.index];
        const phase: Phase =
          step?.kind === 'connect' ? 'connect' : step?.kind === 'finale' ? 'finale' : 'input';
        return { ...state, pending: [], phase };
      }
      return { ...state, pending: event.lines, phase: 'speaking' };
    }

    case 'FINALE_DONE':
    case 'DISMISS':
      return { ...state, phase: 'closed' };

    default:
      return state;
  }
}

/** The ask lines a step opens with ([] for the finale card). */
export function askLines(step: ConciergeStep | undefined): string[] {
  if (!step) return [];
  if (step.kind === 'finale') return [];
  return step.ask;
}
