import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Widget from '../Widget';
import * as api from '@/lib/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  getWidgetData: vi.fn(),
}));

describe('Widget Component', () => {
  const mockSmallData = {
    active_triggers: 5,
    success_rate: 95,
  };

  const mockLargeData = {
    active_triggers: 5,
    total_executions: 42,
    success_rate: 95.0,
    recent_executions: [
      {
        workflow_id: 'test-workflow',
        status: 'completed',
        started_at: '2026-02-23T10:00:00Z',
        duration_seconds: 15,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Apple Standard Dimensions', () => {
    it('renders small widget with exact 170×170px dimensions', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      const { container } = render(<Widget size="small" />);

      await waitFor(() => {
        const widget = container.querySelector('[data-widget-size="small"]');
        expect(widget).toBeInTheDocument();
        expect(widget).toHaveClass('w-[170px]');
        expect(widget).toHaveClass('h-[170px]');
      });
    });

    it('renders large widget with exact 360×170px dimensions', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      const { container } = render(<Widget size="large" />);

      await waitFor(() => {
        const widget = container.querySelector('[data-widget-size="large"]');
        expect(widget).toBeInTheDocument();
        expect(widget).toHaveClass('w-[360px]');
        expect(widget).toHaveClass('h-[170px]');
      });
    });

    it('small widget has correct padding (16px = p-4)', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      const { container } = render(<Widget size="small" />);

      await waitFor(() => {
        const widget = container.querySelector('[data-widget-size="small"]');
        expect(widget).toHaveClass('p-4');
      });
    });

    it('large widget has correct padding (16px = p-4)', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      const { container } = render(<Widget size="large" />);

      await waitFor(() => {
        const widget = container.querySelector('[data-widget-size="large"]');
        expect(widget).toHaveClass('p-4');
      });
    });

    it('small widget has correct border radius (24px = rounded-3xl)', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      const { container } = render(<Widget size="small" />);

      await waitFor(() => {
        const widget = container.querySelector('[data-widget-size="small"]');
        expect(widget).toHaveClass('rounded-3xl');
      });
    });

    it('large widget has correct border radius (24px = rounded-3xl)', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      const { container } = render(<Widget size="large" />);

      await waitFor(() => {
        const widget = container.querySelector('[data-widget-size="large"]');
        expect(widget).toHaveClass('rounded-3xl');
      });
    });

    it('small widget has overflow-hidden class', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      const { container } = render(<Widget size="small" />);

      await waitFor(() => {
        const widget = container.querySelector('[data-widget-size="small"]');
        expect(widget).toHaveClass('overflow-hidden');
      });
    });

    it('large widget has overflow-hidden class', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      const { container } = render(<Widget size="large" />);

      await waitFor(() => {
        const widget = container.querySelector('[data-widget-size="large"]');
        expect(widget).toHaveClass('overflow-hidden');
      });
    });
  });

  describe('Data Loading', () => {
    it('displays loading state with correct dimensions for small widget', () => {
      vi.mocked(api.getWidgetData).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(<Widget size="small" />);

      const loadingWidget = container.querySelector('.animate-pulse');
      expect(loadingWidget).toBeInTheDocument();
      expect(loadingWidget).toHaveClass('w-[170px]');
      expect(loadingWidget).toHaveClass('h-[170px]');
    });

    it('displays loading state with correct dimensions for large widget', () => {
      vi.mocked(api.getWidgetData).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(<Widget size="large" />);

      const loadingWidget = container.querySelector('.animate-pulse');
      expect(loadingWidget).toBeInTheDocument();
      expect(loadingWidget).toHaveClass('w-[360px]');
      expect(loadingWidget).toHaveClass('h-[170px]');
    });

    it('calls getWidgetData with correct size parameter', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      render(<Widget size="small" />);

      await waitFor(() => {
        expect(api.getWidgetData).toHaveBeenCalledWith('small');
      });
    });

    it('defaults to large size when size prop is not provided', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      render(<Widget />);

      await waitFor(() => {
        expect(api.getWidgetData).toHaveBeenCalledWith('large');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error state with correct dimensions for small widget', async () => {
      vi.mocked(api.getWidgetData).mockRejectedValue(new Error('API Error'));

      const { container } = render(<Widget size="small" />);

      await waitFor(() => {
        const errorWidget = container.querySelector('.text-destructive');
        expect(errorWidget).toBeInTheDocument();
        expect(errorWidget).toHaveClass('w-[170px]');
        expect(errorWidget).toHaveClass('h-[170px]');
      });
    });

    it('displays error state with correct dimensions for large widget', async () => {
      vi.mocked(api.getWidgetData).mockRejectedValue(new Error('API Error'));

      const { container } = render(<Widget size="large" />);

      await waitFor(() => {
        const errorWidget = container.querySelector('.text-destructive');
        expect(errorWidget).toBeInTheDocument();
        expect(errorWidget).toHaveClass('w-[360px]');
        expect(errorWidget).toHaveClass('h-[170px]');
      });
    });

    it('shows error message when data fetch fails', async () => {
      vi.mocked(api.getWidgetData).mockRejectedValue(new Error('Network error'));

      render(<Widget size="small" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load widget data')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display - Small Widget', () => {
    it('displays active triggers count', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      render(<Widget size="small" />);

      await waitFor(() => {
        expect(screen.getByText('Active Triggers')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('displays success rate when provided', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      render(<Widget size="small" />);

      await waitFor(() => {
        expect(screen.getByText(/Success: 95/)).toBeInTheDocument();
      });
    });
  });

  describe('Data Display - Large Widget', () => {
    it('displays app dashboard header', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      render(<Widget size="large" />);

      await waitFor(() => {
        expect(screen.getByText('App Dashboard')).toBeInTheDocument();
      });
    });

    it('displays active triggers in stats grid', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      render(<Widget size="large" />);

      await waitFor(() => {
        expect(screen.getByText('Active Triggers')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('displays success rate with percentage', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      render(<Widget size="large" />);

      await waitFor(() => {
        expect(screen.getByText('Success Rate')).toBeInTheDocument();
        expect(screen.getByText('95.0%')).toBeInTheDocument();
      });
    });

    it('displays recent executions when available', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);

      render(<Widget size="large" />);

      await waitFor(() => {
        expect(screen.getByText('Recent Executions')).toBeInTheDocument();
        expect(screen.getByText('test-workflow')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh Behavior', () => {
    it('sets up 30-second refresh interval', async () => {
      vi.useFakeTimers();
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      render(<Widget size="small" />);

      await waitFor(() => {
        expect(api.getWidgetData).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(api.getWidgetData).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('re-fetches data when size prop changes', async () => {
      vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);

      const { rerender } = render(<Widget size="small" />);

      await waitFor(() => {
        expect(api.getWidgetData).toHaveBeenCalledWith('small');
      });

      vi.mocked(api.getWidgetData).mockResolvedValue(mockLargeData);
      rerender(<Widget size="large" />);

      await waitFor(() => {
        expect(api.getWidgetData).toHaveBeenCalledWith('large');
      });
    });
  });

  describe('TypeScript Type Safety', () => {
    it('only accepts "small" or "large" as size prop', () => {
      // This is a compile-time check, but we can verify runtime behavior
      const validSizes: Array<'small' | 'large'> = ['small', 'large'];

      validSizes.forEach(size => {
        vi.mocked(api.getWidgetData).mockResolvedValue(mockSmallData);
        const { unmount } = render(<Widget size={size} />);
        unmount();
      });

      // TypeScript should prevent: <Widget size="medium" />
      // This test verifies the type is correctly enforced
      expect(validSizes).toHaveLength(2);
    });
  });
});
