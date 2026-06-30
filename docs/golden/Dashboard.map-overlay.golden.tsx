/**
 * GOLDEN REFERENCE — MAP + OVERLAY LIST archetype (not built/imported;
 * `.golden.tsx` so tsc/vite ignore it). The BAR for a location-centric app
 * (field sites, store locations, deliveries, places). COMPOSE THE KIT
 * (`@clarittyai/app-ui`) — do NOT hand-roll the shell. Adapt the domain to the
 * real app; do NOT copy this content.
 *
 * Why it's the bar:
 *  - A large map surface (your map lib mounts in the map Card) + a side List of
 *    locations; selecting a Row would pan/highlight its pin.
 *  - ONE primary action (add location) in the header.
 *  - All three states first-class. Token-only color, dark-mode parity, ≥44px
 *    targets, 8pt spacing — from the kit.
 *
 * Domain here is a neutral fictional "field sites" tool so it reads as
 * reference. Drop in Leaflet/Mapbox where marked.
 */
import { useEffect, useState } from 'react';
import { Plus, RefreshCw, MapPin } from 'lucide-react';
import {
  AppShell,
  PageHeader,
  Card,
  CardContent,
  Button,
  List,
  Row,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonCards,
} from '@clarittyai/app-ui';
import { appName } from '@/lib/app-meta';
import { getSites, addSite, type Site } from '@/lib/api';

export default function Dashboard() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setSites(await getSites());
      setError(null);
    } catch {
      setError('Could not load your sites');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell width="xl">
      <PageHeader
        title={appName}
        description="Every site on the map, with status at a glance."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => void addSite().then(load)}>
            Add site
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
      ) : sites === null ? (
        <SkeletonCards count={2} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="min-h-[420px] overflow-hidden">
            <CardContent className="flex h-full items-center justify-center">
              {/* TODO(agent): mount your map library here (Leaflet / Mapbox) and
                  plot one pin per site; selecting a Row pans to its pin. */}
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <MapPin className="h-6 w-6" />
                <p className="text-sm">Map renders here</p>
              </div>
            </CardContent>
          </Card>

          {sites.length === 0 ? (
            <EmptyState
              title="No sites yet"
              description="Add your first location to see it on the map."
              action={<Button onClick={() => void addSite().then(load)}>Add site</Button>}
            />
          ) : (
            <List>
              {sites.map((s) => (
                <Row
                  key={s.id}
                  leading={<MapPin className="h-4 w-4 text-accent" />}
                  title={s.name}
                  subtitle={s.address}
                  trailing={<Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Idle'}</Badge>}
                />
              ))}
            </List>
          )}
        </div>
      )}
    </AppShell>
  );
}
