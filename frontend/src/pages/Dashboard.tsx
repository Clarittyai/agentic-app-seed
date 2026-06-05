import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  Section,
  Card,
  CardContent,
  Button,
  EmptyState,
} from '@clarittyai/app-ui';
import { appName } from '@/lib/app-meta';

/**
 * The app's landing page. Built from the @clarittyai/app-ui kit (PageHeader,
 * Section, Card, Button, EmptyState) — token-only, dark-mode-ready, one primary
 * action. Renders inside <Layout> (which owns the header + background).
 *
 * This is the STARTER landing: generation replaces it with the app's real home
 * screen (the work/data the user came for) — see IDENTITY.md.
 */
export default function Dashboard() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title={appName}
        description="Your starter app. Replace this page with the real work your users came for."
        action={
          <Button icon={<Sparkles className="h-4 w-4" />}>Get started</Button>
        }
      />

      <Section title="Build your app">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-foreground">
                Compose from the kit
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Use <code className="text-foreground">@clarittyai/app-ui</code>{' '}
                primitives (PageHeader, Section, Card, Stat, List, EmptyState,
                ErrorState) so every screen stays on-brand and handles its states.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-foreground">Wire your data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add backend agents, workflows, and triggers; surface a glance in
                the widget. Then route this page to your real home screen.
              </p>
              <Link
                to="/tasks"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
              >
                See the example <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Your home screen">
        <EmptyState
          title="Nothing here yet"
          description="This is where your app's primary content will live once you build it."
          action={<Button variant="secondary">Open the example</Button>}
        />
      </Section>
    </div>
  );
}
