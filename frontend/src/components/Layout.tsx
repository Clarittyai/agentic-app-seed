import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Home, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Layout({ children, darkMode, toggleDarkMode }: LayoutProps) {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Triggers', href: '/triggers', icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <img
                src="https://clarity.ai/logo.svg"
                alt="Clarity"
                className="h-8"
                onError={(e) => {
                  // Fallback to emoji if logo fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.querySelector('.logo-fallback')?.classList.remove('hidden');
                }}
              />
              <span className="text-2xl logo-fallback hidden">⚡</span>
              <span className="hidden font-bold sm:inline-block">
                Clarity Starter Template
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'transition-colors hover:text-foreground/80 flex items-center gap-2',
                    location.pathname === item.href
                      ? 'text-foreground'
                      : 'text-foreground/60'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            <a
              href="https://clarity.ai"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Clarity Platform
            </a>
            {' '}• Official Starter Template • Built with{' '}
            <a
              href="https://www.anthropic.com/claude"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Claude AI
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
