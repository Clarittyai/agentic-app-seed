/**
 * GOLDEN REFERENCE — Records TABLE archetype (not built/imported; `.golden.tsx`
 * so tsc/vite ignore it). The BAR for a data-heavy app whose main screen is a
 * scannable table of records (orders, invoices, inventory, leads). COMPOSE THE
 * KIT (`@clarittyai/app-ui`) — do NOT hand-roll a <table>. Adapt the domain to
 * the real app; do NOT copy this content.
 *
 * Why it's the bar:
 *  - One scannable Table: the columns are the FIELDS THAT MATTER, one row per
 *    record, a status Badge column, money/numbers right-aligned + tabular.
 *  - A quiet Toolbar above it (count + the ONE primary action) — not a hero.
 *  - All three states first-class: SkeletonCards (loading), EmptyState (short
 *    line + primary action), ErrorState (retry). Token-only color, dark-mode
 *    parity, ≥44px targets, 8pt spacing — from the kit.
 *
 * Domain here is a neutral fictional "invoices" tool so it reads as reference.
 */
import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import {
  AppShell,
  PageHeader,
  Toolbar,
  Button,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonCards,
} from '@clarittyai/app-ui';
import { appName } from '@/lib/app-meta';
import { getInvoices, createInvoice, type Invoice } from '@/lib/api';

const STATUS_TONE: Record<Invoice['status'], 'success' | 'warning' | 'neutral'> = {
  paid: 'success',
  due: 'warning',
  draft: 'neutral',
};

export default function Dashboard() {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setRows(await getInvoices());
      setError(null);
    } catch {
      setError('Could not load your invoices');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell width="xl">
      <PageHeader
        title={appName}
        description="Every invoice, paid and outstanding, in one place."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => void createInvoice().then(load)}>
            New invoice
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
      ) : rows === null ? (
        <SkeletonCards count={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create your first invoice and it'll appear in the table."
          action={<Button onClick={() => void createInvoice().then(load)}>New invoice</Button>}
        />
      ) : (
        <>
          <Toolbar trailing={<span className="text-sm text-muted-foreground">{rows.length} invoices</span>} />
          <Table>
            <THead>
              <TR>
                <TH>Invoice</TH>
                <TH>Client</TH>
                <TH className="w-32">Status</TH>
                <TH className="w-28 text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((inv) => (
                <TR key={inv.id}>
                  <TD><span className="font-medium text-foreground">{inv.number}</span></TD>
                  <TD><span className="text-muted-foreground">{inv.client}</span></TD>
                  <TD><Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge></TD>
                  <TD className="text-right tabular-nums font-medium text-foreground">
                    ${inv.amount.toLocaleString()}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </AppShell>
  );
}
