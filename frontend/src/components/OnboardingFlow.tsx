import { useCallback, useEffect, useState } from 'react';
import { Button, Field, Input, Select } from '@clarittyai/app-ui';
import {
  getOnboarding,
  saveOnboarding,
  toApiError,
  type OnboardingQuestion,
  type OnboardingStatus,
} from '@/lib/api';
import { useToast } from '@/components/Toast';

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

// The first-run experience is the ConciergeOnboarding modal (conversational,
// data-aware). This file keeps only the reusable form — the Settings →
// Preferences editor.
