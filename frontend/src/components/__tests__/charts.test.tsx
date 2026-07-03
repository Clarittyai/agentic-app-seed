import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarList } from '../charts/BarList';
import { TrendLine } from '../charts/TrendLine';
import { Sparkline } from '../charts/Sparkline';

describe('BarList', () => {
  const data = [
    { label: 'Negotiation', value: 760000 },
    { label: 'Evaluation', value: 350000 },
    { label: 'Discovery', value: 45000, detail: '2 deals' },
  ];

  it('renders an accessible svg with value labels at the bar tips', () => {
    const { container } = render(
      <BarList title="Open pipeline by stage" data={data} />,
    );
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', 'Open pipeline by stage');
    expect(screen.getByText('760K')).toBeInTheDocument();
    expect(screen.getByText('Negotiation')).toBeInTheDocument();
  });

  it('table twin toggle swaps the chart for a matching table', () => {
    const { container } = render(<BarList title="By stage" data={data} />);
    fireEvent.click(screen.getByLabelText('Show data table'));
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(screen.getByText('Evaluation')).toBeInTheDocument();
    // toggle back
    fireEvent.click(screen.getByLabelText('Show chart'));
    expect(container.querySelector('svg[role="img"]')).toBeInTheDocument();
  });

  it('folds rows beyond maxRows into "Other"', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      label: `Stage ${i}`,
      value: (10 - i) * 100,
    }));
    render(<BarList title="Many" data={many} maxRows={4} />);
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('shows a prose empty state with no data', () => {
    render(<BarList title="Empty" data={[]} emptyText="Nothing in flight" />);
    expect(screen.getByText('Nothing in flight')).toBeInTheDocument();
  });
});

describe('TrendLine', () => {
  const points = [
    { t: '2026-07-01T09:00:00Z', v: 100 },
    { t: '2026-07-02T09:00:00Z', v: 220 },
    { t: '2026-07-03T09:00:00Z', v: 180 },
    { t: '2026-07-04T09:00:00Z', v: 300 },
  ];

  it('renders the line, grid ticks, and x extent labels', () => {
    const { container } = render(<TrendLine title="Pulse" points={points} />);
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeInTheDocument();
    // grid: at least one hairline + tick label
    expect(container.querySelectorAll('line.stroke-border').length).toBeGreaterThan(0);
    // line + area paths
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
  });

  it('shows the prose empty state under two points', () => {
    render(<TrendLine title="Pulse" points={[{ t: '2026-07-01', v: 5 }]} />);
    expect(screen.getByText(/second data point/)).toBeInTheDocument();
  });
});

describe('Sparkline', () => {
  it('renders a polyline for a series', () => {
    const { container } = render(<Sparkline series={[1, 3, 2, 5]} />);
    expect(container.querySelector('polyline')).toBeInTheDocument();
  });

  it('renders nothing under two points', () => {
    const { container } = render(<Sparkline series={[1]} />);
    expect(container.firstChild).toBeNull();
  });
});
