'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, Bell, Shield, Menu, Sun, Moon, Search } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useOfflineSync } from '@/lib/useOfflineSync';
import { getPendingCount } from '@/lib/offlineQueue';
import { Badge } from '../ui';
import { SyncIndicator } from './Sidebar';
import { openCommandPalette } from '@/components/v1/skiper92';
import { toast } from 'sonner';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/admin': 'Platform Dashboard',
  '/admin/businesses': 'Registered Businesses',
  '/sales': 'Sales & Checkout',
  '/inventory': 'Inventory',
  '/receiving': 'Stock Receiving',
  '/expiration': 'Expiration Tracking',
  '/suppliers': 'Suppliers',
  '/suppliers/directory': 'Supplier Directory',
  '/replenishments': 'Purchase Orders',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'Settings',
};

interface HeaderProps {
  onMenuClick: () => void;
  onToggleSidebar?: () => void;
}

export function Header({ onMenuClick, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const sync = useOfflineSync();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pageTitle = PAGE_TITLES[pathname] || 'Dashboard';
  const hasPendingAlerts = sync.pending > 0 || sync.flagged > 0 || sync.rejected > 0;

  const handleLogout = useCallback(async () => {
    try {
      const pending = await getPendingCount();
      if (pending > 0) {
        const confirmed = window.confirm(
          `You have ${pending} unsynced offline transaction(s). Sign out anyway? (They will remain safely tied to your account until you sign back in.)`
        );
        if (!confirmed) return;
      }
    } catch {
      /* proceed with logout if IndexedDB is unavailable */
    }
    await logout();
    toast.dismiss();
    toast.success('Signed out', { id: 'auth-toast', description: 'You have been signed out successfully.' });
    router.push('/login');
  }, [logout, router]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AG';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-brand-800 px-3.5 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
      {/* Left: Hamburger menu toggle + ONLY page title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
              onToggleSidebar?.();
            } else {
              onMenuClick();
            }
          }}
          aria-label="Toggle navigation menu"
          title="Toggle navigation menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none text-sm sm:text-base font-semibold tracking-tight text-white">{pageTitle}</h1>
      </div>

      {/* Center: Search trigger on desktop, empty on mobile */}
      <div className="hidden md:flex flex-1 justify-center px-4">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Open command palette"
          className="flex h-9 w-full max-w-xs items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-white/80 transition-colors hover:bg-white/15 hover:text-white dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 shrink-0 text-brand-200 dark:text-brand-400" />
            <span>Search pages &amp; actions...</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/90 dark:border-slate-700 dark:bg-slate-900">
              Ctrl K
            </kbd>
          </span>
        </button>
      </div>

      {/* Right side: Dark Mode Toggle -> Notification Bell -> User Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <SyncIndicator
          pending={sync.pending}
          rejected={sync.rejected}
          flagged={sync.flagged}
          offline={sync.offline}
        />

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mounted && resolvedTheme === 'dark' ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => {
            toast.dismiss();
            if (hasPendingAlerts) {
              toast.info('Sync queue attention', {
                id: 'notifications-toast',
                description: `${sync.pending} pending, ${sync.flagged} flagged, ${sync.rejected} rejected.`,
              });
            } else {
              toast.info('No new notifications', {
                id: 'notifications-toast',
                description: "You're all caught up!",
              });
            }
          }}
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {hasPendingAlerts && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-brand-800 dark:ring-slate-900"
              aria-hidden="true"
            />
          )}
        </button>

        {/* User Avatar with Dropdown */}
        {user ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Open user menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-2 ring-white/20 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {initials}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-brand-700 dark:text-brand-400" aria-hidden="true" />
                    <Badge
                      variant="default"
                      className="bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-800 dark:bg-brand-950 dark:text-brand-300"
                    >
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <DropdownMenu.Item
                  onSelect={handleLogout}
                  className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <Link
            href="/login"
            className="h-9 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
