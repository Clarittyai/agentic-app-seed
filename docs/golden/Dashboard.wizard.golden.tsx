/**
 * GOLDEN REFERENCE — STEP WIZARD archetype (not built/imported; `.golden.tsx`
 * so tsc/vite ignore it). The BAR for a guided multi-step flow that produces
 * ONE outcome (intake, onboarding, an application). COMPOSE THE KIT
 * (`@clarittyai/app-ui`) — do NOT hand-roll inputs. Adapt the domain to the
 * real app; do NOT copy this content.
 *
 * Why it's the bar:
 *  - A step indicator (Progress + current-step Badge), a Card of real Fields for
 *    the current step, and Back/Next in a Toolbar — the final step performs the
 *    primary action.
 *  - ONE forward primary action per step; Back is secondary.
 *  - Labeled inputs with hints (the kit's Field/Input). Token-only color,
 *    dark-mode parity, ≥44px targets, 8pt spacing — from the kit.
 *
 * Domain here is a neutral fictional "client intake" flow so it reads as
 * reference.
 */
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import {
  AppShell,
  PageHeader,
  Section,
  Card,
  CardContent,
  Field,
  Input,
  Textarea,
  Select,
  Button,
  Toolbar,
  Progress,
  Badge,
} from '@clarittyai/app-ui';
import { appName } from '@/lib/app-meta';
import { submitIntake } from '@/lib/api';

const STEPS = ['Client', 'Project', 'Review'] as const;

export default function Dashboard() {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <AppShell>
      <PageHeader title={appName} description="Onboard a new client in three quick steps." />

      <Section
        title={`Step ${step + 1} of ${STEPS.length}`}
        trailing={<Badge tone="accent">{STEPS[step]}</Badge>}
      >
        <Progress value={((step + 1) / STEPS.length) * 100} />

        <Card className="mt-4">
          <CardContent className="flex flex-col gap-4">
            {step === 0 && (
              <>
                <Field label="Client name">
                  <Input placeholder="Acme Inc." />
                </Field>
                <Field label="Email" hint="We'll send the kickoff here">
                  <Input type="email" placeholder="ops@acme.com" />
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Project type">
                  <Select>
                    <option>Retainer</option>
                    <option>Fixed scope</option>
                  </Select>
                </Field>
                <Field label="Goals" hint="What does success look like?">
                  <Textarea placeholder="Describe the outcome…" />
                </Field>
              </>
            )}
            {step === 2 && (
              <p className="text-sm text-muted-foreground">
                Review the details above, then finish to create the client.
              </p>
            )}
          </CardContent>
        </Card>

        <Toolbar
          trailing={
            isLast ? (
              <Button icon={<Check className="h-4 w-4" />} onClick={() => void submitIntake()}>
                Finish
              </Button>
            ) : (
              <Button
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
              >
                Next
              </Button>
            )
          }
        >
          <Button
            variant="secondary"
            icon={<ArrowLeft className="h-4 w-4" />}
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
          >
            Back
          </Button>
        </Toolbar>
      </Section>
    </AppShell>
  );
}
