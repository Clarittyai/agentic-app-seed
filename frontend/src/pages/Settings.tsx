import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  getTriggerTemplates,
  getUserTriggers,
  createUserTrigger,
  updateUserTrigger,
  deleteUserTrigger,
  type TriggerTemplate,
  type UserTrigger,
} from '@/lib/api';
import {
  Settings as SettingsIcon,
  Plus,
  Clock,
  Play,
  Pause,
  Trash2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Settings() {
  const [templates, setTemplates] = useState<TriggerTemplate[]>([]);
  const [triggers, setTriggers] = useState<UserTrigger[]>([]);
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
      const [templatesResp, triggersResp] = await Promise.all([
        getTriggerTemplates(),
        getUserTriggers(),
      ]);
      setTemplates(templatesResp.templates);
      setTriggers(triggersResp.triggers);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrigger = async () => {
    if (!selectedTemplate) return;

    try {
      await createUserTrigger({
        template_id: selectedTemplate.id,
        name: triggerName,
        config: formData,
      });
      setShowCreateModal(false);
      setSelectedTemplate(null);
      setFormData({});
      setTriggerName('');
      await loadData();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('Failed to create schedule');
    }
  };

  const handleToggleTrigger = async (trigger: UserTrigger) => {
    try {
      await updateUserTrigger(trigger.id, { enabled: !trigger.enabled });
      await loadData();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await deleteUserTrigger(triggerId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const openCreateModal = (template: TriggerTemplate) => {
    setSelectedTemplate(template);
    const defaults: Record<string, any> = {};
    template.config_fields.forEach((field: { key: string; default?: any }) => {
      defaults[field.key] = field.default || '';
    });
    setFormData(defaults);
    setTriggerName('');
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6">
          <SettingsIcon className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">
            Configuration
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
          Automation{' '}
          <span className="text-gradient">Settings</span>
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
          Manage when your inbox is checked and how emails are filtered.
        </p>
      </motion.div>

      {/* Active Schedules */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Clock className="h-6 w-6 text-accent" />
            Active Schedules
            <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
              ({triggers.filter(t => t.enabled).length})
            </span>
          </h2>
        </div>

        {triggers.length === 0 ? (
          <div className="bg-gradient-to-br from-accent/5 to-purple/5 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No schedules configured
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Set up when you want your inbox checked automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {triggers.map((trigger) => {
              const template = templates.find((t) => t.id === trigger.template_id);

              return (
                <motion.div
                  key={trigger.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover-lift',
                    !trigger.enabled && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {trigger.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {template?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleTrigger(trigger)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          trigger.enabled
                            ? 'bg-green/10 text-green hover:bg-green/20'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        )}
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
                        className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green" />
                      {trigger.total_executions} runs
                    </span>
                    {trigger.enabled && (
                      <span className="px-2 py-1 bg-green/10 text-green text-xs font-medium rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Add New Schedule */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Plus className="h-6 w-6 text-accent" />
          Add New Schedule
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover-lift"
            >
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
              </div>
              <button
                onClick={() => openCreateModal(template)}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-xl py-3 px-4 font-medium hover:bg-accent-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Configure
              </button>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Create Schedule Modal */}
      {showCreateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedTemplate.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {selectedTemplate.description}
            </p>

            {/* Schedule Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Name this schedule *
              </label>
              <input
                type="text"
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                placeholder="e.g., Morning inbox check"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Dynamic Form Fields */}
            {selectedTemplate.config_fields.map((field: any) => (
              <div key={field.key} className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {field.label}
                  {field.required && ' *'}
                </label>

                {field.type === 'select' && field.options ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.key]: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                  >
                    {field.options.map((option: { value: any; label: string }) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'boolean' ? (
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData[field.key] || false}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                  </label>
                ) : (
                  <input
                    type={field.type === 'time' ? 'time' : field.type === 'number' ? 'number' : 'text'}
                    value={formData[field.key] || ''}
                    onChange={(e) => {
                      const value = field.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                      setFormData({ ...formData, [field.key]: value });
                    }}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                  />
                )}
              </div>
            ))}

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTrigger}
                disabled={!triggerName}
                className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Schedule
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
