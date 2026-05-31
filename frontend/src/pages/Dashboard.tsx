import { TerminalSquare, FileCode2, Rocket, ArrowRight } from 'lucide-react';
import AgentGraph from '@/components/AgentGraph';
import HowItWorks from '@/components/HowItWorks';
import WidgetGallery from '@/components/WidgetGallery';

/**
 * Template showcase — the un-customized landing for a Claritty app, modeled on
 * `create-react-app` / `ng new`: it explains how Claritty apps work and shows
 * THIS app's live agent graph. Generation replaces this page with the app's
 * real UI, so it never ships to a finished app. (The Task example that used to
 * live here moved out; the widget below is kept as a working demo.)
 */

const STEPS = [
  {
    icon: TerminalSquare,
    title: 'Open in Claude Code or Cursor',
    body: 'Clone the repo and open it in Claude Code or Cursor. Point your AI coding agent at the folder and describe what you want the app to do.',
  },
  {
    icon: FileCode2,
    title: 'Edit the building blocks',
    body: 'Agents → backend/agents/ · workflows → backend/workflows/ · triggers → backend/triggers/ · the widget → frontend/src/components/Widget.tsx. Ask Claude Code or Cursor to change them.',
  },
  {
    icon: Rocket,
    title: 'Run & ship',
    body: 'Run docker compose up (or npm run dev) to preview locally. Push and Claritty redeploys to your app’s URL — widget and triggers come along automatically.',
  },
];

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-5xl space-y-16 sm:space-y-20">
      {/* Hero */}
      <section className="text-center">
        <img
          src="/claritty-logo.png"
          alt="Claritty"
          className="mx-auto mb-5 h-12 w-12 object-contain sm:h-14 sm:w-14"
        />
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Claritty Template
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          A Claritty app, working <span className="text-accent">end to end</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Agents, a workflow, a daily trigger, and a dashboard widget — already wired together and
          running below. Open it in Claude Code or Cursor, change what you want, and ship.
        </p>
      </section>

      {/* Live agent graph + runner */}
      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Live — this app right now
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            The real agents and triggers your backend is serving. Run one and watch it work.
          </p>
        </div>
        <AgentGraph />
      </section>

      {/* How Claritty apps work */}
      <section className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How Claritty apps work
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Five building blocks. Each maps to a file you can edit.
          </p>
        </div>
        <HowItWorks />
      </section>

      {/* Getting started */}
      <section className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Get started
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-border sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Widget demo — all three sizes, embedded as the platform embeds them */}
      <section className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            The dashboard widget
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            How this app appears at a glance on the Claritty dashboard, at all three sizes. Defined in{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              frontend/src/components/Widget.tsx
            </code>
            .
          </p>
        </div>
        <WidgetGallery />
      </section>
    </div>
  );
}
