import { useEffect, useState } from 'react';
import { getWidgetData, type WidgetData } from '@/lib/api';
import { Activity, Zap, TrendingUp, Clock } from 'lucide-react';
import { cn, formatDate, formatDuration } from '@/lib/utils';

interface WidgetProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function Widget({ size = 'medium', className }: WidgetProps) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className={cn('animate-pulse bg-card rounded-lg border p-6', className)}>
        <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-destructive/10 text-destructive rounded-lg border p-6', className)}>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Small widget - minimal info
  if (size === 'small') {
    return (
      <div className={cn('bg-card rounded-lg border p-4', className)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Active Triggers</p>
            <p className="text-2xl font-bold">{data.active_triggers}</p>
          </div>
          <Zap className="h-8 w-8 text-primary" />
        </div>
        {data.success_rate !== undefined && (
          <div className="mt-2 text-xs text-muted-foreground">
            Success: {data.success_rate}
          </div>
        )}
      </div>
    );
  }

  // Medium widget - more details
  if (size === 'medium') {
    return (
      <div className={cn('bg-card rounded-lg border p-6', className)}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          App Status
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Active Triggers</p>
            <p className="text-2xl font-bold">{data.active_triggers}</p>
          </div>
          {data.total_executions !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="text-2xl font-bold">{data.total_executions}</p>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Success Rate
            </div>
            <span className="font-semibold text-lg">
              {data.success_rate?.toFixed(1)}%
            </span>
          </div>
          {data.last_execution && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              Last execution: {formatDate(data.last_execution)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Large widget - full details with execution history
  return (
    <div className={cn('bg-card rounded-lg border p-6', className)}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        App Dashboard
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-background rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Triggers</p>
          <p className="text-3xl font-bold mt-1">{data.active_triggers}</p>
        </div>
        {data.total_executions !== undefined && (
          <div className="bg-background rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Executions</p>
            <p className="text-3xl font-bold mt-1">{data.total_executions}</p>
          </div>
        )}
        {data.success_rate !== undefined && (
          <div className="bg-background rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p className="text-3xl font-bold mt-1 text-green-600">
              {data.success_rate.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Recent Executions */}
      {data.recent_executions && data.recent_executions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Recent Executions</h4>
          <div className="space-y-2">
            {data.recent_executions.map((execution, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      execution.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">{execution.workflow_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(execution.started_at)}
                    </p>
                  </div>
                </div>
                {execution.duration_seconds !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(execution.duration_seconds)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
