import SetupChecklist from '@/components/SetupChecklist';

/**
 * Integrations page — the in-app home for connecting the external services this
 * app needs (e.g. LinkedIn). The list + connect actions live in the reusable
 * <SetupChecklist> (also surfaced as a banner on the Dashboard until everything
 * is connected). Connecting is a platform-owned OAuth flow.
 */
export default function Integrations() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the services this app uses. Your credentials are stored securely by
          Claritty — this app never sees them.
        </p>
      </header>
      <SetupChecklist />
    </div>
  );
}
