import { describe, it, expect } from 'vitest';
import {
  buildScript,
  conciergeReducer,
  firstOpenStep,
  initialConciergeState,
  renderTemplate,
  renderLine,
  type ConciergeState,
} from '../concierge';
import type { OnboardingQuestion, RequiredIntegration } from '@/lib/api';

const q = (over: Partial<OnboardingQuestion> & { key: string }): OnboardingQuestion => ({
  label: over.key,
  type: 'text',
  ...over,
});

describe('renderTemplate', () => {
  it('pass 1 then pass 2 enables dynamic ctx lookups', () => {
    const r = renderTemplate('{label} — flags {ctx.quiet_preview.{value}} accounts.', {
      value: '14',
      label: '14 days',
      ctx: { quiet_preview: { '14': 2 } },
    });
    expect(r).toEqual({ text: '14 days — flags 2 accounts.', resolved: true });
  });

  it('unresolved ctx token → resolved false', () => {
    const r = renderTemplate('I see {ctx.accounts_count} accounts.', { ctx: {} });
    expect(r.resolved).toBe(false);
  });

  it('persona tokens resolve', () => {
    const r = renderTemplate('I am {persona.name}, {persona.tagline}.', {
      persona: { name: 'Neilson', tagline: 'your revenue copilot' },
    });
    expect(r.text).toBe('I am Neilson, your revenue copilot.');
  });
});

describe('renderLine fallback chain', () => {
  it('falls to the fallback template, then generic', () => {
    const vars = { value: 1, label: 'one', ctx: {} };
    expect(renderLine('{ctx.missing}', 'fallback {label}', 'generic', vars)).toBe('fallback one');
    expect(renderLine('{ctx.missing}', '{ctx.also_missing}', 'generic {label}', vars)).toBe(
      'generic one',
    );
  });
});

describe('buildScript', () => {
  const sf: RequiredIntegration = {
    id: 'salesforce',
    name: 'Salesforce',
    connected: false,
    connect_url: 'https://x/connect',
  };

  it('synthesizes ask/ack for bare questions and appends a finale', () => {
    const script = buildScript({
      questions: [q({ key: 'a', label: 'Question A', help: 'Helpful' })],
      ctx: {},
      integrations: [],
      embedded: false,
    });
    expect(script.map((s) => s.kind)).toEqual(['question', 'finale']);
    const step = script[0];
    if (step.kind !== 'question') throw new Error('expected question');
    expect(step.ask).toEqual(['Question A', 'Helpful']);
    expect(step.ack).toBe('Got it — {label}.');
  });

  it('includes the connect step only when actionable', () => {
    const withUrl = buildScript({ questions: [], ctx: {}, integrations: [sf], embedded: false });
    expect(withUrl[0].kind).toBe('connect');

    const bareLocal = buildScript({
      questions: [],
      ctx: {},
      integrations: [{ ...sf, connect_url: null }],
      embedded: false,
    });
    expect(bareLocal[0].kind).toBe('finale');

    const embedded = buildScript({
      questions: [],
      ctx: {},
      integrations: [{ ...sf, connect_url: null }],
      embedded: true,
    });
    expect(embedded[0].kind).toBe('connect');
  });
});

describe('firstOpenStep / resume', () => {
  it('skips answered questions', () => {
    const script = buildScript({
      questions: [q({ key: 'a' }), q({ key: 'b' })],
      ctx: {},
      integrations: [],
      embedded: false,
    });
    expect(firstOpenStep(script, {})).toBe(0);
    expect(firstOpenStep(script, { a: '1' })).toBe(1);
    expect(firstOpenStep(script, { a: '1', b: '2' })).toBe(2); // finale
  });
});

describe('conciergeReducer', () => {
  const script = buildScript({
    questions: [
      q({ key: 'target', label: 'Target?', type: 'number', ack: 'Noted: {value}.' }),
      q({
        key: 'lead_view',
        label: 'Lead?',
        type: 'select',
        options: [{ value: 'progress', label: 'Progress' }],
      }),
    ],
    ctx: {},
    integrations: [],
    embedded: false,
  });

  const boot = (): ConciergeState =>
    conciergeReducer(initialConciergeState, {
      type: 'READY',
      script,
      savedAnswers: {},
      intro: ['Hello.'],
    });

  it('READY queues intro + first ask, speaking phase', () => {
    const s = boot();
    expect(s.phase).toBe('speaking');
    expect(s.pending).toEqual(['Hello.', 'Target?']);
  });

  it('SPOKEN lands pending in the transcript and opens input', () => {
    const s = conciergeReducer(boot(), { type: 'SPOKEN' });
    expect(s.phase).toBe('input');
    expect(s.transcript.map((b) => b.text)).toEqual(['Hello.', 'Target?']);
  });

  it('SUBMIT records the answer + user bubble and enters thinking', () => {
    let s = conciergeReducer(boot(), { type: 'SPOKEN' });
    s = conciergeReducer(s, { type: 'SUBMIT', key: 'target', value: 5, userText: '5 logos' });
    expect(s.answers).toEqual({ target: 5 });
    expect(s.transcript.at(-1)?.role).toBe('user');
    expect(s.pending).toEqual([]);
    expect(s.phase).toBe('thinking');
  });

  it('AI_LINES settles the ack + next ask, then SPOKEN opens input', () => {
    let s = conciergeReducer(boot(), { type: 'SPOKEN' });
    s = conciergeReducer(s, { type: 'SUBMIT', key: 'target', value: 5, userText: '5' });
    s = conciergeReducer(s, { type: 'AI_LINES', lines: ['Noted: 5.', 'Lead?'] });
    expect(s.pending).toEqual(['Noted: 5.', 'Lead?']);
    expect(s.phase).toBe('speaking');
    s = conciergeReducer(s, { type: 'SPOKEN' });
    expect(s.phase).toBe('input');
  });

  it('ADVANCE (connect/skip) moves on without a user bubble', () => {
    let s = boot();
    const before = s.transcript.length;
    s = conciergeReducer(s, { type: 'ADVANCE' });
    expect(s.index).toBe(1);
    expect(s.transcript.length).toBe(before);
    expect(s.phase).toBe('thinking');
  });

  it('walks through to finale and closes', () => {
    let s = conciergeReducer(boot(), { type: 'SPOKEN' });
    s = conciergeReducer(s, { type: 'SUBMIT', key: 'target', value: 5, userText: '5' });
    s = conciergeReducer(s, { type: 'AI_LINES', lines: ['a', 'Lead?'] });
    s = conciergeReducer(s, { type: 'SPOKEN' });
    s = conciergeReducer(s, { type: 'SUBMIT', key: 'lead_view', value: 'progress', userText: 'Progress' });
    s = conciergeReducer(s, { type: 'AI_LINES', lines: ['done'] });
    s = conciergeReducer(s, { type: 'SPOKEN' });
    expect(s.phase).toBe('finale');
    s = conciergeReducer(s, { type: 'FINALE_DONE' });
    expect(s.phase).toBe('closed');
  });

  it('AI_LINES with no lines falls straight through to the step phase', () => {
    let s = conciergeReducer(boot(), { type: 'SPOKEN' });
    s = conciergeReducer(s, { type: 'SUBMIT', key: 'target', value: 5, userText: '5' });
    s = conciergeReducer(s, { type: 'SUBMIT', key: 'lead_view', value: 'progress', userText: 'P' });
    s = conciergeReducer(s, { type: 'AI_LINES', lines: [] });
    expect(s.phase).toBe('finale');
  });

  it('resume starts at the first unanswered question with saved answers kept', () => {
    const s = conciergeReducer(initialConciergeState, {
      type: 'READY',
      script,
      savedAnswers: { target: 5 },
      intro: ['Welcome back.'],
    });
    expect(s.answers).toEqual({ target: 5 });
    expect(s.pending).toEqual(['Welcome back.', 'Lead?']);
  });

  it('DISMISS closes from any phase', () => {
    expect(conciergeReducer(boot(), { type: 'DISMISS' }).phase).toBe('closed');
  });
});
