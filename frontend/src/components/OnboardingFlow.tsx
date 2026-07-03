import { useCallback, useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button, Field, Input, Select } from '@clarittyai/app-ui';
import {
  getOnboarding,
  saveOnboarding,
  toApiError,
  type OnboardingQuestion,
  type OnboardingStatus,
} from '@/lib/api';
import { useToast } from '@/components/Toast';

const DISMISS_KEY = 'claritty_onboarding_dismissed_v1';

/**
 * AI onboarding — the first-run interview that tailors this app's
 * intelligence to THIS user. Answers are saved as a per-user profile; every
 * agent run reads it (via `user_context`, see backend/shared/onboarding.py)
 * so goals, thresholds, and priorities shape what the agents do — and the
 * dashboard can show progress against the goals the user stated.
 *
 * Questions are app-authored in app-config.json → `onboarding.questions`
 * (filled at generation time to fit the domain). No questions → this whole
 * surface stays hidden.
 */

// ── The reusable form (also the Settings → Preferences editor) ──────────────

export function OnboardingForm({
  variant = 'onboarding',
  onCompleted,
}: {
  variant?: 'onboarding' | 'settings';
  onCompleted?: () => void;
}) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

  const load = useCallback(async () => {
    try {
      const s = await getOnboarding();
      setStatus(s);
      const initial: Record<string, string> = {};
      for (const q of s.questions) {
        const saved = s.answers?.[q.key];
        initial[q.key] = saved === undefined || saved === null ? '' : String(saved);
      }
      setValues(initial);
      setError(null);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="text-sm font-medium text-foreground">{error}</p>;
  }
  if (status === null) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (status.questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This app has no preferences to set.
      </p>
    );
  }

  const submit = async () => {
    setSaving(true);
    try {
      const answers: Record<string, unknown> = {};
      for (const q of status.questions) {
        const raw = (values[q.key] ?? '').trim();
        if (raw === '') continue;
        answers[q.key] = q.type === 'number' ? Number(raw) : raw;
      }
      await saveOnboarding(answers);
      show({
        tone: 'success',
        text:
          variant === 'onboarding'
            ? 'You’re set — the agents will tailor their work to your goals.'
            : 'Preferences saved.',
      });
      onCompleted?.();
      void load();
    } catch (err) {
      show({ tone: 'error', text: `Couldn’t save: ${toApiError(err).message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {status.questions.map((q) => (
        <QuestionField
          key={q.key}
          question={q}
          value={values[q.key] ?? ''}
          onChange={(v) => setValues((prev) => ({ ...prev, [q.key]: v }))}
        />
      ))}
      <Button onClick={() => void submit()} disabled={saving}>
        {saving ? 'Saving…' : variant === 'onboarding' ? 'Start' : 'Save preferences'}
      </Button>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: OnboardingQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  const { key, label, type, options, help, placeholder } = question;
  if (type === 'select') {
    return (
      <Field label={label} hint={help}>
        <Select value={value} onChange={(e) => onChange(e.target.value)} name={key}>
          <option value="">Choose…</option>
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  return (
    <Field label={label} hint={help}>
      <Input
        name={key}
        type={type === 'number' ? 'number' : 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

// ── The first-run card (mounted in Layout, under the integrations checklist) ─

export function OnboardingFlow() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      /* private mode — treat as not dismissed */
    }
    getOnboarding()
      .then((s) => setVisible(s.questions.length > 0 && !s.completed))
      .catch(() => setVisible(false)); // a setup hint must never crash the app
  }, []);

  if (!visible || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Make this app yours
            </p>
            <p className="text-xs text-muted-foreground">
              A few answers tailor the agents to your goals — and define the
              progress this app will track for you.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4">
        <OnboardingForm variant="onboarding" onCompleted={() => setVisible(false)} />
      </div>
    </div>
  );
}
