/**
 * GOLDEN REFERENCE — LIST + DETAIL archetype (not built/imported; `.golden.tsx`
 * so tsc/vite ignore it). The BAR for a content-management app: browse a
 * collection on the left, open ONE record on the right to read/edit it
 * (contacts, notes, documents, simple CRUD). COMPOSE THE KIT
 * (`@clarittyai/app-ui`) — do NOT hand-roll the split. Adapt the domain to the
 * real app; do NOT copy this content.
 *
 * Why it's the bar:
 *  - A two-pane split: a master List (selectable Rows) + a detail Card that
 *    renders the selected record's real fields via DescriptionList.
 *  - ONE primary action (new record) in the header; selection is the main
 *    interaction, not a second primary button.
 *  - All three states first-class. Token-only color, dark-mode parity, ≥44px
 *    targets, 8pt spacing — from the kit.
 *
 * Domain here is a neutral fictional "contacts" tool so it reads as reference.
 */
import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Mail } from 'lucide-react';
import {
  AppShell,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DescriptionList,
  Button,
  List,
  Row,
  Avatar,
  EmptyState,
  ErrorState,
  SkeletonCards,
} from '@clarittyai/app-ui';
import { appName } from '@/lib/app-meta';
import { getContacts, createContact, type Contact } from '@/lib/api';

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await getContacts();
      setContacts(data);
      setSelectedId((id) => id ?? data[0]?.id ?? null);
      setError(null);
    } catch {
      setError('Could not load your contacts');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selected = contacts?.find((c) => c.id === selectedId) ?? null;

  return (
    <AppShell width="xl">
      <PageHeader
        title={appName}
        description="Your people, with everything you need on each one."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => void createContact().then(load)}>
            New contact
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
      ) : contacts === null ? (
        <SkeletonCards count={3} />
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Add your first contact to start building your list."
          action={<Button onClick={() => void createContact().then(load)}>New contact</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <List>
            {contacts.map((c) => (
              <Row
                key={c.id}
                leading={<Avatar name={c.name} />}
                title={c.name}
                subtitle={c.company}
                onClick={() => setSelectedId(c.id)}
              />
            ))}
          </List>

          <Card>
            <CardHeader>
              <CardTitle>{selected ? selected.name : 'Select a contact'}</CardTitle>
            </CardHeader>
            <CardContent>
              {selected ? (
                <DescriptionList
                  items={[
                    { label: 'Email', value: selected.email },
                    { label: 'Company', value: selected.company },
                    { label: 'Role', value: selected.role ?? '—' },
                    { label: 'Last touch', value: selected.lastContacted ?? 'Never' },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Pick a contact from the list to see their details.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
