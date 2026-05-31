import { Cpu, Workflow, Clock, LayoutGrid, Plug, type LucideIcon } from 'lucide-react';

/**
 * "How Claritty apps work" — the create-react-app-style explainer. Each card
 * maps a core concept to the file you edit to change it, so the template
 * doubles as documentation. Sourced from the seed's backend layout
 * (agents/ · workflows/ · triggers/) and the frontend widget.
 */

interface Concept {
  icon: LucideIcon;
  title: string;
  blurb: string;
  file: string;
  tone: string;
}

const CONCEPTS: Concept[] = [
  {
    icon: Cpu,
    title: 'Agents',
    blurb: 'Units of work that call Claude (via the metered proxy) and return structured results.',
    file: 'backend/agents/*.py',
    tone: 'text-accent bg-accent/10',
  },
  {
    icon: Workflow,
    title: 'Workflows',
    blurb: 'Chain agents and add custom orchestration. Run on a trigger or on demand.',
    file: 'backend/workflows/*.py',
    tone: 'text-purple bg-purple/10',
  },
  {
    icon: Clock,
    title: 'Triggers',
    blurb: 'Run workflows on a schedule or webhook. The platform manages instances per user.',
    file: 'backend/triggers/*.py',
    tone: 'text-warning bg-warning/10',
  },
  {
    icon: LayoutGrid,
    title: 'Widgets',
    blurb: 'The at-a-glance surface on the Claritty dashboard — small, medium, and large.',
    file: 'frontend/src/components/Widget.tsx',
    tone: 'text-success bg-success/10',
  },
  {
    icon: Plug,
    title: 'Integrations',
    blurb: 'Bring-your-own OAuth / API keys so agents can reach Slack, Sheets, and more.',
    file: 'backend/integrations/',
    tone: 'text-teal bg-teal/10',
  },
];

export default function HowItWorks() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CONCEPTS.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold text-foreground">{c.title}</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{c.blurb}</p>
            <code className="mt-3 inline-block w-fit rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {c.file}
            </code>
          </div>
        );
      })}
    </div>
  );
}
