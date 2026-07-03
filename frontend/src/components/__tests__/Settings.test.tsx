import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Settings from '@/pages/Settings';
import { ToastProvider } from '@/components/Toast';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  getRequiredIntegrations: vi.fn(),
  getOnboarding: vi.fn(),
  saveOnboarding: vi.fn(),
  toApiError: (err: unknown) => ({
    message: err instanceof Error ? err.message : 'Something went wrong',
  }),
}));

function renderSettings() {
  return render(
    <ToastProvider>
      <Settings />
    </ToastProvider>,
  );
}

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getOnboarding).mockResolvedValue({
      questions: [],
      completed: false,
      answers: {},
    });
  });

  it('lists declared integrations with their status', async () => {
    vi.mocked(api.getRequiredIntegrations).mockResolvedValue({
      integrations: [
        { id: 'salesforce', name: 'Salesforce', connected: false, connect_url: null },
        { id: 'slack', name: 'Slack', connected: true, connect_url: null },
      ],
      all_connected: false,
      app_id: 'app-1',
    });
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText('Salesforce')).toBeInTheDocument();
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });
    // bare local (top window, no connect_url) → the open-on-Claritty note
    expect(screen.getByText('Open this app on Claritty to connect')).toBeInTheDocument();
    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
  });

  it('shows the self-contained empty state with zero integrations', async () => {
    vi.mocked(api.getRequiredIntegrations).mockResolvedValue({
      integrations: [],
      all_connected: true,
      app_id: null,
    });
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText('Self-contained app')).toBeInTheDocument();
    });
  });

  it('re-probes when the host acks a connect-done', async () => {
    vi.mocked(api.getRequiredIntegrations).mockResolvedValue({
      integrations: [
        { id: 'salesforce', name: 'Salesforce', connected: false, connect_url: null },
      ],
      all_connected: false,
      app_id: 'app-1',
    });
    renderSettings();
    await waitFor(() => expect(api.getRequiredIntegrations).toHaveBeenCalledTimes(1));

    const ev = new MessageEvent('message', {
      data: { type: 'claritty:connect-integration-done', integrationId: 'salesforce' },
    });
    Object.defineProperty(ev, 'source', { value: window }); // jsdom top: parent === window
    window.dispatchEvent(ev);

    await waitFor(() => expect(api.getRequiredIntegrations).toHaveBeenCalledTimes(2));
  });
});
