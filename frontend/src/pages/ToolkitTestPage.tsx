import { useSearchParams } from 'react-router-dom';
import TestWidget from '@/components/TestWidget';

/**
 * Test page for validating @clarittyai/widget-toolkit installation
 *
 * Access:
 * - Small widget: /test-toolkit?size=small
 * - Large widget: /test-toolkit?size=large (default)
 */
export default function ToolkitTestPage() {
  const [searchParams] = useSearchParams();
  const size = (searchParams.get('size') || 'large') as 'small' | 'large';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Widget Toolkit Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing @clarittyai/widget-toolkit v1.0.0
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Current size: <span className="font-mono font-bold">{size}</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <TestWidget size={size} />

          <div className="flex gap-3 mt-4">
            <a
              href="/test-toolkit?size=small"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              View Small (190×190)
            </a>
            <a
              href="/test-toolkit?size=large"
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
            >
              View Large (400×190)
            </a>
          </div>
        </div>

        <div className="mt-8 max-w-md text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-2">✅ Toolkit Features Tested:</p>
          <ul className="text-left space-y-1 bg-white/50 dark:bg-black/20 rounded-lg p-4">
            <li>• WidgetContainer with strict dimensions</li>
            <li>• WidgetButton with 44px minimum touch target</li>
            <li>• widgetText typography utilities</li>
            <li>• widgetGradients preset styles</li>
            <li>• Apple HIG compliance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
