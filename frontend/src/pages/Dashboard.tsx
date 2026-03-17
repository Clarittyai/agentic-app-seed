import { motion } from 'framer-motion';
import Widget from '@/components/Widget';
import { Mail, Clock, TrendingUp, Sparkles } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-12">
      {/* Hero Section with Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">
            Smart Email Filtering
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
          Your Inbox,{' '}
          <span className="text-gradient">Simplified</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
          AI-powered email filtering that learns what's important to you.
          Stay focused on what matters.
        </p>

        {/* Widget - Hero Element */}
        <div className="flex justify-center mb-8">
          <Widget size="large" className="hover-lift" />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-500">
          Updates automatically every 30 seconds
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
      >
        <StatsCard
          icon={<Mail className="w-6 h-6 text-accent" />}
          label="Filtered Today"
          value="24"
          change="+12%"
          changeType="positive"
        />
        <StatsCard
          icon={<TrendingUp className="w-6 h-6 text-green" />}
          label="Time Saved"
          value="18 min"
          change="+5 min"
          changeType="positive"
        />
        <StatsCard
          icon={<Clock className="w-6 h-6 text-purple" />}
          label="Last Check"
          value="Just now"
          change="Active"
          changeType="neutral"
        />
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
          <button className="text-sm font-medium text-accent hover:text-accent-600 transition-colors">
            View All
          </button>
        </div>

        <div className="space-y-3">
          <ActivityItem
            time="2 minutes ago"
            action="3 emails filtered as high priority"
            icon={<Mail className="w-4 h-4 text-orange" />}
          />
          <ActivityItem
            time="15 minutes ago"
            action="Inbox checked and organized"
            icon={<Clock className="w-4 h-4 text-accent" />}
          />
          <ActivityItem
            time="1 hour ago"
            action="12 emails sorted successfully"
            icon={<TrendingUp className="w-4 h-4 text-green" />}
          />
        </div>
      </motion.div>

      {/* How It Works (Optional - can be removed if too much info) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-gradient-to-br from-accent/5 to-purple/5 rounded-2xl p-8 border border-gray-200 dark:border-gray-800"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          How It Works
        </h3>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <span className="font-bold text-accent">1</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Monitor</strong> - Automatically checks your inbox every 15 minutes
            </p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center mb-3">
              <span className="font-bold text-purple">2</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Analyze</strong> - AI determines urgency and importance using Claude
            </p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center mb-3">
              <span className="font-bold text-green">3</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Organize</strong> - Priority emails highlighted for quick action
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Stats Card Component
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

function StatsCard({ icon, label, value, change, changeType }: StatsCardProps) {
  const changeColor =
    changeType === 'positive' ? 'text-green' :
    changeType === 'negative' ? 'text-red-500' :
    'text-gray-500';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </span>
        <span className={`text-sm font-medium ${changeColor}`}>
          {change}
        </span>
      </div>
    </div>
  );
}

// Activity Item Component
interface ActivityItemProps {
  time: string;
  action: string;
  icon: React.ReactNode;
}

function ActivityItem({ time, action, icon }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {action}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {time}
        </p>
      </div>
    </div>
  );
}
