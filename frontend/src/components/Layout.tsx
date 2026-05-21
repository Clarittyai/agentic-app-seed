import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Home, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { appName } from '@/lib/app-meta';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Layout({ children, darkMode, toggleDarkMode }: LayoutProps) {
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header - Apple-style glass morphism */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo — the app's own name (no platform branding) */}
            <Link to="/" className="flex items-center gap-3 group">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-sm font-bold">
                {appName.charAt(0).toUpperCase()}
              </span>
              <span className="inline-block text-lg lg:text-xl font-bold text-gray-900 dark:text-white group-hover:text-accent transition-colors">
                {appName}
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1 lg:gap-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="relative px-4 lg:px-5 py-2 rounded-lg group"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span
                        className={cn(
                          'text-sm lg:text-base font-medium transition-colors',
                          isActive
                            ? 'text-accent'
                            : 'text-gray-600 dark:text-gray-300 group-hover:text-accent'
                        )}
                      >
                        {item.name}
                      </span>
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-accent/10 rounded-lg -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    {/* Hover effect */}
                    <span className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity -z-20" />
                  </Link>
                );
              })}

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="ml-2 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors touch-manipulation"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-16rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
        >
          {children}
        </motion.div>
      </main>

      {/* Footer - Minimal Apple style */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
            <p className="text-center sm:text-left font-medium text-gray-900 dark:text-white">
              {appName}
            </p>
            <p className="text-center sm:text-right text-xs text-gray-500 dark:text-gray-500">
              © {new Date().getFullYear()} {appName}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
