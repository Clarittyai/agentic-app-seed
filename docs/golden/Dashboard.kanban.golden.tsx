/**
 * GOLDEN REFERENCE — KANBAN board archetype (not built/imported; `.golden.tsx`
 * so tsc/vite ignore it). The BAR for a status-tracking app where records move
 * through stages (sales pipeline, applicants, tickets, tasks). COMPOSE THE KIT
 * (`@clarittyai/app-ui`) — do NOT hand-roll columns. Adapt the domain to the
 * real app; do NOT copy this content.
 *
 * Why it's the bar:
 *  - Columns ARE the app's real status values; each holds compact Cards grouped
 *    by status, with a count in the column heading.
 *  - ONE primary action (add a record) in the header; moving cards is the work.
 *  - All three states first-class. Token-only color, dark-mode parity, ≥44px
 *    targets, 8pt spacing — from the kit.
 *
 * Domain here is a neutral fictional "deal pipeline" so it reads as reference.
 */
import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import {
  AppShell,
  PageHeader,
  Section,
  Card,
  CardContent,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonCards,
} from '@clarittyai/app-ui';
import { appName } from '@/lib/app-meta';
import { getDeals, createDeal, type Deal } from '@/lib/api';

// The real app's status values become the columns (in workflow order).
const STAGES: Deal['stage'][] = ['Lead', 'Qualified', 'Proposal', 'Won'];

export default function Dashboard() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setDeals(await getDeals());
      setError(null);
    } catch {
      setError('Could not load your pipeline');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell width="xl">
      <PageHeader
        title={appName}
        description="Move every deal from first touch to closed."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => void createDeal().then(load)}>
            New deal
          </Button>
        }
      />

      {error ? (
        <ErrorState
          title={error}
          action={
            <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      ) : deals === null ? (
        <SkeletonCards count={4} />
      ) : deals.length === 0 ? (
        <EmptyState
          title="Your pipeline is empty"
          description="Add your first deal and it'll land in the Lead column."
          action={<Button onClick={() => void createDeal().then(load)}>New deal</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((stage) => {
            const inStage = deals.filter((d) => d.stage === stage);
            return (
              <Section key={stage} title={`${stage} (${inStage.length})`}>
                <div className="flex flex-col gap-3">
                  {inStage.map((d) => (
                    <Card key={d.id}>
                      <CardContent className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-foreground">{d.company}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{d.owner}</span>
                          <Badge tone="accent">${d.value.toLocaleString()}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
