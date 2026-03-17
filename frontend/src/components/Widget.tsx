import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWidgetData, markEmailsAsRead, type WidgetData } from '@/lib/api';
import { cn } from '@/lib/utils';

interface WidgetProps {
  size?: 'small' | 'large';
  className?: string;
}

export default function Widget({ size = 'large', className }: WidgetProps) {
  const navigate = useNavigate();
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

  const handleOpenDashboard = () => {
    navigate('/dashboard');
  };

  const handleMarkAsRead = async () => {
    if (actionLoading) return;

    setActionLoading(true);
    try {
      // Call API to mark urgent emails as read
      const result = await markEmailsAsRead();
      console.log(result.message);

      // Refresh widget data after marking as read
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
        size === 'small' ? 'w-[170px] h-[170px]' : 'w-[360px] h-[170px]',
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
        size === 'small' ? 'w-[170px] h-[170px]' : 'w-[360px] h-[170px]',
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
      maxUrgency === 'critical' ? 'text-red-600' :
      maxUrgency === 'high' ? 'text-orange-600' :
      maxUrgency === 'medium' ? 'text-yellow-600' :
      'text-blue-600';

    const urgencyBgColor =
      maxUrgency === 'critical' ? 'bg-red-50 dark:bg-red-950/20' :
      maxUrgency === 'high' ? 'bg-orange-50 dark:bg-orange-950/20' :
      maxUrgency === 'medium' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
      'bg-blue-50 dark:bg-blue-950/20';

    const urgencyText =
      maxUrgency === 'critical' ? 'CRITICAL' :
      maxUrgency === 'high' ? 'HIGH' :
      maxUrgency === 'medium' ? 'MEDIUM' :
      'LOW';

    const count = data.important_emails_today || 0;

    return (
      <div
        className={cn('w-[170px] h-[170px] bg-card rounded-3xl border p-4 overflow-hidden flex flex-col items-center justify-between', className)}
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
            className="w-full text-sm font-bold text-white bg-primary hover:bg-primary/90 py-2 px-3 rounded-lg transition-colors"
          >
            Open Inbox
          </button>
          <div className="text-[10px] text-center text-muted-foreground/60">
            Powered by Clarity
          </div>
        </div>
      </div>
    );
  }

  // Large widget - Quick Actions design (Apple standard: 360×170px wide rectangle)
  // Available content: 138px height (170 - 32px padding)
  const urgentEmails = data.recent_important_emails || [];
  const criticalCount = urgentEmails.filter(e => e.urgency_level === 'critical').length;
  const highCount = urgentEmails.filter(e => e.urgency_level === 'high').length;
  const totalUrgent = criticalCount + highCount;
  const mostUrgentEmail = urgentEmails[0];

  return (
    <div
      className={cn('w-[360px] h-[170px] bg-card rounded-3xl border p-4 overflow-hidden flex flex-col', className)}
      data-widget-size="large"
    >
      {/* Status Bar - 24px content + 8px margin = 32px */}
      <div className="flex items-center justify-between mb-2 h-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold leading-none">{totalUrgent}</span>
          <span className="text-xs text-muted-foreground">urgent</span>
          {criticalCount > 0 && (
            <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded">
              {highCount} High
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{data.last_checked}</span>
      </div>

      {/* Email Preview Card - 66px + 8px margin = 74px */}
      {mostUrgentEmail ? (
        <div className="bg-muted/30 rounded-lg p-3 mb-2 h-[66px] flex items-center">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-tight truncate">{mostUrgentEmail.subject}</div>
              <div className="text-xs text-muted-foreground truncate mt-1">{mostUrgentEmail.sender}</div>
            </div>
            <span className={cn(
              'text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0',
              mostUrgentEmail.urgency_level === 'critical' ? 'text-red-600 bg-red-50 dark:bg-red-950/20' :
              mostUrgentEmail.urgency_level === 'high' ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/20' :
              'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20'
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

      {/* Quick Action Buttons - 32px */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 flex-1">
          <button
            onClick={handleOpenDashboard}
            className="text-xs font-bold text-white bg-primary hover:bg-primary/90 py-2 px-3 rounded-lg transition-colors h-8 flex items-center justify-center"
          >
            Open
          </button>
          <button
            onClick={handleMarkAsRead}
            disabled={actionLoading}
            className="text-xs font-bold text-foreground bg-secondary hover:bg-secondary/80 py-2 px-3 rounded-lg transition-colors h-8 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Loading...' : 'Mark Read'}
          </button>
          <button
            onClick={handleOpenDashboard}
            className="text-xs font-bold text-foreground bg-secondary hover:bg-secondary/80 py-2 px-3 rounded-lg transition-colors h-8 flex items-center justify-center"
          >
            View All
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
          Powered by Clarity
        </div>
      </div>
    </div>
  );
}
