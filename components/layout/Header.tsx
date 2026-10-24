'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, Bell, Shield, Menu, Sun, Moon, Settings, Search } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useOfflineSync } from '@/lib/useOfflineSync';
import { getPendingCount } from '@/lib/offlineQueue';
import { Badge } from '../ui';
import { SyncIndicator } from './Sidebar';
import { VercelIconsMenuWithTooltip } from '@/components/v1/skiper43';
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

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && event.shiftKey) {
        event.preventDefault();
        router.push('/settings');
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        handleLogout();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, handleLogout]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const quickMenuItems = [
    {
      id: 'notifications',
      label: hasPendingAlerts ? 'Pending sync alerts' : 'Notifications',
      icon: Bell,
      hasBadge: hasPendingAlerts,
      onClick: () => {
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
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      shortcut: ['⌘', 'S'],
      onClick: () => router.push('/settings'),
    },
    {
      id: 'logout',
      label: 'Sign out',
      icon: LogOut,
      shortcut: ['⌘', 'Q'],
      onClick: handleLogout,
    },
  ];

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AG';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-brand-800 px-4 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
      {/* Left: ONLY the page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight text-white">{pageTitle}</h1>
      </div>

      {/* Center: Empty on mobile; global command palette trigger on desktop */}
      <div className="hidden md:flex flex-1 justify-center px-4">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Open command palette"
          className="flex h-9 w-full max-w-xs items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-white/80 transition-colors hover:bg-white/15 hover:text-white dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 shrink-0 text-brand-200 dark:text-brand-400" />
            <span>Quick jump or search...</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/90 dark:border-slate-700 dark:bg-slate-900">
              Ctrl K
            </kbd>
          </span>
        </button>
      </div>

      {/* Right: Clean flex row with gap-3 */}
      <div className="flex items-center gap-3">
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

        {/* Vercel-style Icons Menu with Spring Tooltip (skiper43) */}
        <VercelIconsMenuWithTooltip items={quickMenuItems} />

        {/* User Avatar with Dropdown (Role badge + Logout) */}
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
                  onSelect={() => router.push('/settings')}
                  className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                >
                  <Settings className="h-4 w-4 text-brand-700 dark:text-brand-400" />
                  <span>Settings</span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onSelect={handleLogout}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
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

        {/* Mobile menu button (only on mobile) */}
        <button
          type="button"
          onClick={onMenuClick}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
