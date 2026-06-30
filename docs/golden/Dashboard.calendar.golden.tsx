/**
 * GOLDEN REFERENCE — AGENDA / CALENDAR archetype (not built/imported;
 * `.golden.tsx` so tsc/vite ignore it). The BAR for a time-based app where a
 * date is the primary axis (scheduling, bookings, content calendar, events).
 * COMPOSE THE KIT (`@clarittyai/app-ui`) — do NOT hand-roll a date grid. Adapt
 * the domain to the real app; do NOT copy this content.
 *
 * Why it's the bar:
 *  - A date-ordered agenda grouped BY DAY, each item a Row with a time Badge —
 *    the layout the data's time-axis actually calls for (not stat cards).
 *  - ONE primary action (schedule) in the header.
 *  - All three states first-class. Token-only color, dark-mode parity, ≥44px
 *    targets, 8pt spacing — from the kit.
 *
 * Domain here is a neutral fictional "coaching sessions" tool so it reads as
 * reference.
 */
import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import {
  AppShell,
  PageHeader,
  Section,
  Button,
  List,
  Row,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonCards,
} from '@clarittyai/app-ui';
import { appName } from '@/lib/app-meta';
import { getSessions, scheduleSession, type Session } from '@/lib/api';

function groupByDay(sessions: Session[]): [string, Session[]][] {
  const map = new Map<string, Session[]>();
  for (const s of [...sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const day = new Date(s.startsAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    map.set(day, [...(map.get(day) ?? []), s]);
  }
  return [...map.entries()];
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setSessions(await getSessions());
      setError(null);
    } catch {
      setError('Could not load your schedule');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell>
      <PageHeader
        title={appName}
        description="Everything coming up, in order, day by day."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => void scheduleSession().then(load)}>
            Schedule session
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
      ) : sessions === null ? (
        <SkeletonCards count={4} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Nothing scheduled"
          description="Schedule your first session and it'll show up on your agenda."
          action={<Button onClick={() => void scheduleSession().then(load)}>Schedule session</Button>}
        />
      ) : (
        groupByDay(sessions).map(([day, items]) => (
          <Section key={day} title={day}>
            <List>
              {items.map((s) => (
                <Row
                  key={s.id}
                  title={s.title}
                  subtitle={s.client}
                  trailing={
                    <Badge tone="accent">
                      {new Date(s.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </Badge>
                  }
                />
              ))}
            </List>
          </Section>
        ))
      )}
    </AppShell>
  );
}
