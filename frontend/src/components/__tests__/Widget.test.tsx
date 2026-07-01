import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Widget from '../Widget';
import * as api from '@/lib/api';
import type { AppResult } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  getResults: vi.fn(),
}));

// Canonical dimensions per size. The widget is built on the UI kit's
// WidgetContainer, which enforces these via INLINE STYLE (width/height/overflow)
// + the p-4 / rounded-3xl classes + a data-widget-size attribute.
const DIMS = {
  small: { w: '170px', h: '170px' },
  medium: { w: '360px', h: '170px' },
  large: { w: '360px', h: '360px' },
} as const;

const SIZES = ['small', 'medium', 'large'] as const;

const mockResults: AppResult[] = [
  { id: 'r1', title: 'Weekly digest ready', body: '5 items summarized', status: 'new', kind: 'digest', created_at: '2026-07-01T09:00:00Z' },
  { id: 'r2', title: 'Draft reply to Acme', body: 'Proposed a call Thursday', status: 'new', kind: 'reply', created_at: '2026-07-01T08:30:00Z' },
  { id: 'r3', title: 'Lead scored: 87', body: 'High intent', status: 'new', kind: 'score', created_at: '2026-07-01T08:00:00Z' },
];

function expectCanonical(el: Element | null, size: keyof typeof DIMS) {
  expect(el).toBeInTheDocument();
  const e = el as HTMLElement;
  expect(e.style.width).toBe(DIMS[size].w);
  expect(e.style.height).toBe(DIMS[size].h);
  expect(e.style.overflow).toBe('hidden');
  expect(e).toHaveClass('p-4');
  expect(e).toHaveClass('rounded-3xl');
}

describe('Widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canonical dimensions + style invariants (all 3 sizes)', () => {
    it.each(SIZES)('renders %s at exact dims, p-4, rounded-3xl, overflow hidden', async (size) => {
      vi.mocked(api.getResults).mockResolvedValue(mockResults);
      const { container } = render(<Widget size={size} />);
      await waitFor(() => {
        expectCanonical(container.querySelector(`[data-widget-size="${size}"]`), size);
      });
    });

    it.each(SIZES)('loading state keeps %s dimensions', (size) => {
      vi.mocked(api.getResults).mockImplementation(() => new Promise(() => {}));
      const { container } = render(<Widget size={size} />);
      const el = container.querySelector('.animate-pulse') as HTMLElement;
      expect(el).toBeInTheDocument();
      expect(el.style.width).toBe(DIMS[size].w);
      expect(el.style.height).toBe(DIMS[size].h);
    });
  });

  describe('data loading', () => {
    it.each(SIZES)('requests results for size=%s', async (size) => {
      vi.mocked(api.getResults).mockResolvedValue(mockResults);
      render(<Widget size={size} />);
      await waitFor(() => expect(api.getResults).toHaveBeenCalled());
    });

    it('defaults to the medium frame when no size prop is given', async () => {
      vi.mocked(api.getResults).mockResolvedValue(mockResults);
      const { container } = render(<Widget />);
      await waitFor(() => {
        expectCanonical(container.querySelector('[data-widget-size="medium"]'), 'medium');
      });
    });
  });

  describe('content', () => {
    it('small shows the result count', async () => {
      vi.mocked(api.getResults).mockResolvedValue(mockResults);
      render(<Widget size="small" />);
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/recent result/)).toBeInTheDocument();
      });
    });

    it('large lists result titles', async () => {
      vi.mocked(api.getResults).mockResolvedValue(mockResults);
      render(<Widget size="large" />);
      await waitFor(() => {
        expect(screen.getByText('Weekly digest ready')).toBeInTheDocument();
        expect(screen.getByText('Draft reply to Acme')).toBeInTheDocument();
      });
    });

    it('shows an empty state when there is no output yet', async () => {
      vi.mocked(api.getResults).mockResolvedValue([]);
      render(<Widget size="small" />);
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('Nothing yet')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it.each(SIZES)('error state keeps %s dimensions', async (size) => {
      vi.mocked(api.getResults).mockRejectedValue(new Error('boom'));
      const { container } = render(<Widget size={size} />);
      await waitFor(() => {
        const el = container.querySelector(`[data-widget-size="${size}"]`) as HTMLElement;
        expect(el).toBeInTheDocument();
        expect(el.style.width).toBe(DIMS[size].w);
        expect(el.style.height).toBe(DIMS[size].h);
      });
    });
  });

  describe('auto-refresh', () => {
    it('refetches every 30s', async () => {
      vi.useFakeTimers();
      vi.mocked(api.getResults).mockResolvedValue(mockResults);
      render(<Widget size="small" />);
      await vi.waitFor(() => expect(api.getResults).toHaveBeenCalledTimes(1));
      vi.advanceTimersByTime(30000);
      await vi.waitFor(() => expect(api.getResults).toHaveBeenCalledTimes(2));
      vi.useRealTimers();
    });
  });
});
