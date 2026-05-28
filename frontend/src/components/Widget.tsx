import { useEffect, useState } from 'react';
import { getWidgetData, markEmailsAsRead, type WidgetData } from '@/lib/api';
import { triggerDeepLink, runQuickAction } from '@/lib/widget-actions';
import { cn } from '@/lib/utils';

// Apple HIG widget sizes (heights match the platform's 170px grid):
//   small  170×170 — single quick info
//   medium 360×170 — list view, quick actions
//   large  360×360 — multi-row complex view (2 rows + 20px gap = 360)
export type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetProps {
  size?: WidgetSize;
  className?: string;
}

// Per-size dimension classes — must be static literals for Tailwind JIT.
const SIZE_CLASSES: Record<WidgetSize, string> = {
  small: 'w-[170px] h-[170px]',
  medium: 'w-[360px] h-[170px]',
  large: 'w-[360px] h-[360px]',
};

export default function Widget({ size = 'medium', className }: WidgetProps) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [size]);


  const fetchData = async () => {
    try {
      const widgetData = await getWidgetData(size);
      setData(widgetData);
      setError(null);
    } catch (err) {
      setError('Failed to load widget data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Deep link — host opens the full app modal at the dashboard route.
  const handleOpenDashboard = () => {
    triggerDeepLink({ path: '/dashboard' });
  };

  // Quick action — runs the API directly inside the widget iframe; the
  // host gets an analytics ping but no UI change.
  const handleMarkAsRead = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const result = await runQuickAction({
        actionId: 'mark-emails-read',
        run: () => markEmailsAsRead(),
      });
      console.log(result.message);
      await fetchData();
    } catch (err) {
      console.error('Failed to mark emails as read:', err);
      setError('Failed to mark emails as read');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn(
        SIZE_CLASSES[size],
        'animate-pulse bg-card rounded-3xl border p-4 overflow-hidden',
        className
      )}>
        <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        SIZE_CLASSES[size],
        'bg-destructive/10 text-destructive rounded-3xl border p-4 overflow-hidden',
        className
      )}>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Small widget - Alert badge design (Apple standard: 170×170px square)
  // Available content: 138px height (170 - 32px padding)
  if (size === 'small') {
    const maxUrgency = data.recent_important_emails?.[0]?.urgency_level || 'low';
    const urgencyColor =
      maxUrgency === 'critical' ? 'text-pink' :
      maxUrgency === 'high' ? 'text-orange' :
      maxUrgency === 'medium' ? 'text-yellow' :
      'text-accent';

    const urgencyBgColor =
      maxUrgency === 'critical' ? 'bg-pink/10 dark:bg-pink/20' :
      maxUrgency === 'high' ? 'bg-orange/10 dark:bg-orange/20' :
      maxUrgency === 'medium' ? 'bg-yellow/10 dark:bg-yellow/20' :
      'bg-accent/10 dark:bg-accent/20';

    const urgencyText =
      maxUrgency === 'critical' ? 'CRITICAL' :
      maxUrgency === 'high' ? 'HIGH' :
      maxUrgency === 'medium' ? 'MEDIUM' :
      'LOW';

    const count = data.important_emails_today || 0;

    return (
      <div
        className={cn(SIZE_CLASSES.small, 'bg-card rounded-3xl border p-4 overflow-hidden flex flex-col items-center justify-between', className)}
        data-widget-size="small"
      >
        {/* Hero Number - 80px */}
        <div className="flex flex-col items-center gap-1">
          <div className={cn('text-6xl font-bold leading-none', count > 0 ? urgencyColor : 'text-muted-foreground')}>
            {count}
          </div>
          {count > 0 && (
            <div className={cn('text-xs font-bold px-2 py-0.5 rounded', urgencyColor, urgencyBgColor)}>
              {urgencyText}
            </div>
          )}
          {count === 0 && (
            <div className="text-xs text-muted-foreground">
              No urgent emails
            </div>
          )}
        </div>

        {/* Action Button - 58px */}
        <div className="w-full flex flex-col gap-1">
          <button
            onClick={handleOpenDashboard}
            className="w-full text-sm font-bold text-white bg-accent hover:bg-accent-600 py-2 px-3 rounded-lg transition-all active:scale-95"
          >
            Open Inbox
          </button>
        </div>
      </div>
    );
  }

  // Medium / Large widgets share the same status header and quick actions but
  // the large variant adds a second preview row to fill 360×360.
  const urgentEmails = data.recent_important_emails || [];
  const criticalCount = urgentEmails.filter(e => e.urgency_level === 'critical').length;
  const highCount = urgentEmails.filter(e => e.urgency_level === 'high').length;
  const totalUrgent = criticalCount + highCount;
  const mostUrgentEmail = urgentEmails[0];
  const secondUrgentEmail = urgentEmails[1];

  return (
    <div
      className={cn(SIZE_CLASSES[size], 'bg-card rounded-3xl border p-4 overflow-hidden flex flex-col', className)}
      data-widget-size={size}
    >
      {/* Status Bar - 24px content + 8px margin = 32px */}
      <div className="flex items-center justify-between mb-2 h-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold leading-none">{totalUrgent}</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">urgent</span>
          {criticalCount > 0 && (
            <span className="text-xs font-bold text-pink bg-pink/10 dark:bg-pink/20 px-1.5 py-0.5 rounded">
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs font-bold text-orange bg-orange/10 dark:bg-orange/20 px-1.5 py-0.5 rounded">
              {highCount} High
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{data.last_checked}</span>
      </div>

      {/* Email Preview Card(s) — medium shows one, large shows two */}
      {mostUrgentEmail ? (
        <div className="bg-muted/30 rounded-lg p-3 mb-2 h-[66px] flex items-center">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-tight truncate">{mostUrgentEmail.subject}</div>
              <div className="text-xs text-muted-foreground truncate mt-1">{mostUrgentEmail.sender}</div>
            </div>
            <span className={cn(
              'text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0',
              mostUrgentEmail.urgency_level === 'critical' ? 'text-pink bg-pink/10 dark:bg-pink/20' :
              mostUrgentEmail.urgency_level === 'high' ? 'text-orange bg-orange/10 dark:bg-orange/20' :
              'text-yellow bg-yellow/10 dark:bg-yellow/20'
            )}>
              {mostUrgentEmail.urgency_level === 'critical' ? 'CRITICAL' :
               mostUrgentEmail.urgency_level === 'high' ? 'HIGH' : 'MEDIUM'}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 rounded-lg p-3 mb-2 h-[66px] flex items-center justify-center text-sm text-muted-foreground">
          All clear! ✓
        </div>
      )}

      {/* Large-only: extra email rows to fill the 360×360 footprint */}
      {size === 'large' && (
        <div className="flex flex-col gap-2 mb-2">
          {secondUrgentEmail && (
            <div className="bg-muted/30 rounded-lg p-3 h-[66px] flex items-center">
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold leading-tight truncate">{secondUrgentEmail.subject}</div>
                  <div className="text-xs text-muted-foreground truncate mt-1">{secondUrgentEmail.sender}</div>
                </div>
                <span className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0',
                  secondUrgentEmail.urgency_level === 'critical' ? 'text-pink bg-pink/10 dark:bg-pink/20' :
                  secondUrgentEmail.urgency_level === 'high' ? 'text-orange bg-orange/10 dark:bg-orange/20' :
                  'text-yellow bg-yellow/10 dark:bg-yellow/20'
                )}>
                  {secondUrgentEmail.urgency_level === 'critical' ? 'CRITICAL' :
                   secondUrgentEmail.urgency_level === 'high' ? 'HIGH' : 'MEDIUM'}
                </span>
              </div>
            </div>
          )}
          <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground">
            {totalUrgent > 2
              ? `+ ${totalUrgent - 2} more urgent · last checked ${data.last_checked}`
              : `Last checked ${data.last_checked}`}
          </div>
        </div>
      )}

      {/* Quick Action Buttons - 32px */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 flex-1">
          <button
            onClick={handleOpenDashboard}
            className="text-xs font-bold text-white bg-accent hover:bg-accent-600 py-2 px-3 rounded-lg transition-all active:scale-95 h-8 flex items-center justify-center"
          >
            Open
          </button>
          <button
            onClick={handleMarkAsRead}
            disabled={actionLoading}
            className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 py-2 px-3 rounded-lg transition-all active:scale-95 h-8 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Loading...' : 'Mark Read'}
          </button>
          <button
            onClick={handleOpenDashboard}
            className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 py-2 px-3 rounded-lg transition-all active:scale-95 h-8 flex items-center justify-center"
          >
            View All
          </button>
        </div>
      </div>
    </div>
  );
}
