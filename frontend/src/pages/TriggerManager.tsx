import { useEffect, useState } from 'react';
import {
  listTriggerTemplates,
  listMyTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  type TriggerTemplate,
  type TriggerInstance,
} from '@/lib/api';
import {
  Zap,
  Plus,
  Calendar,
  Clock,
  Database,
  Webhook,
  Play,
  Pause,
  Trash2,
  Edit,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export default function TriggerManager() {
  const [templates, setTemplates] = useState<TriggerTemplate[]>([]);
  const [triggers, setTriggers] = useState<TriggerInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TriggerTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [triggerName, setTriggerName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, triggersData] = await Promise.all([
        listTriggerTemplates(),
        listMyTriggers(),
      ]);
      setTemplates(templatesData);
      setTriggers(triggersData);
    } catch (error) {
      console.error('Failed to load trigger data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrigger = async () => {
    if (!selectedTemplate) return;

    try {
      await createTrigger(selectedTemplate.id, triggerName, formData);
      setShowCreateModal(false);
      setSelectedTemplate(null);
      setFormData({});
      setTriggerName('');
      await loadData(); // Refresh list
    } catch (error) {
      console.error('Failed to create trigger:', error);
      alert('Failed to create trigger');
    }
  };

  const handleToggleTrigger = async (trigger: TriggerInstance) => {
    try {
      await updateTrigger(trigger.id, { enabled: !trigger.enabled });
      await loadData();
    } catch (error) {
      console.error('Failed to toggle trigger:', error);
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;

    try {
      await deleteTrigger(triggerId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete trigger:', error);
    }
  };

  const openCreateModal = (template: TriggerTemplate) => {
    setSelectedTemplate(template);
    // Initialize form with default values
    const defaults: Record<string, any> = {};
    template.config_fields.forEach((field) => {
      defaults[field.key] = field.default || '';
    });
    setFormData(defaults);
    setTriggerName('');
    setShowCreateModal(true);
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'SCHEDULE_DAILY':
      case 'SCHEDULE_CRON':
        return Calendar;
      case 'SCHEDULE_INTERVAL':
        return Clock;
      case 'DATA_THRESHOLD':
      case 'DATA_CHANGE':
        return Database;
      case 'WEBHOOK':
        return Webhook;
      default:
        return Zap;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trigger Manager</h1>
        <p className="text-muted-foreground mt-2">
          Configure when your workflows should execute automatically.
        </p>
      </div>

      {/* My Triggers */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          My Triggers
          <span className="text-base font-normal text-muted-foreground">
            ({triggers.length})
          </span>
        </h2>

        {triggers.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No triggers configured</h3>
            <p className="text-muted-foreground mb-4">
              Create your first trigger from the templates below.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {triggers.map((trigger) => {
              const template = templates.find((t) => t.id === trigger.template_id);
              const Icon = template ? getTemplateIcon(template.template_type) : Zap;

              return (
                <div
                  key={trigger.id}
                  className={cn(
                    'bg-card rounded-lg border p-6',
                    !trigger.enabled && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold">{trigger.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleTrigger(trigger)}
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                        title={trigger.enabled ? 'Pause' : 'Resume'}
                      >
                        {trigger.enabled ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(trigger.id)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="space-y-2 mb-4">
                    {Object.entries(trigger.config).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-medium">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                    <span>Executions: {trigger.total_executions}</span>
                    <span>Failures: {trigger.total_failures}</span>
                  </div>
                  {trigger.last_triggered_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last triggered: {formatDate(trigger.last_triggered_at)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Trigger Templates */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-6 w-6 text-primary" />
          Available Templates
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const Icon = getTemplateIcon(template.template_type);

            return (
              <div
                key={template.id}
                className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      {template.category}
                    </p>
                  </div>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>
                <button
                  onClick={() => openCreateModal(template)}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Trigger
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Create Trigger Modal */}
      {showCreateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Create {selectedTemplate.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {selectedTemplate.description}
            </p>

            {/* Trigger Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Trigger Name *
              </label>
              <input
                type="text"
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                placeholder="My Custom Trigger"
                className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Dynamic Form Fields */}
            {selectedTemplate.config_fields.map((field) => (
              <div key={field.key} className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {field.label}
                  {field.required && ' *'}
                </label>

                {field.type === 'select' && field.options ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.key]: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'multi-select' && field.options ? (
                  <div className="space-y-2">
                    {field.options.map((option) => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={
                            Array.isArray(formData[field.key]) &&
                            formData[field.key].includes(option.value)
                          }
                          onChange={(e) => {
                            const current = formData[field.key] || [];
                            const updated = e.target.checked
                              ? [...current, option.value]
                              : current.filter((v: any) => v !== option.value);
                            setFormData({ ...formData, [field.key]: updated });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'boolean' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData[field.key] || false}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={formData[field.key] || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field.key]: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <input
                    type={field.type === 'time' ? 'time' : 'text'}
                    value={formData[field.key] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.key]: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            ))}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTrigger}
                disabled={!triggerName}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Trigger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
