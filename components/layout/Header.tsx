'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LogOut, Bell, Shield, Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useOfflineSync } from '@/lib/useOfflineSync';
import { getPendingCount } from '@/lib/offlineQueue';
import { Badge } from '../ui';
import { SyncIndicator } from './Sidebar';
import { toast } from 'sonner';
import { NavbarLogo } from '@/components/brand';

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

  const handleLogout = async () => {
    // SEC-04 / UX-07: Confirm before signing out if there are unsynced offline transactions
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
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 dark:border-slate-800 bg-brand-800 dark:bg-slate-900 px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Logo or Desktop Page Title */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <NavbarLogo href={user?.role === 'admin' ? '/admin' : '/dashboard'} size="sm" showWordmark={true} />
        </div>
        <div className="hidden lg:flex lg:items-center lg:gap-2.5">
          <span className="text-sm font-semibold text-white">{pageTitle}</span>
          {user?.businessName && (
            <>
              <span className="text-white/30">·</span>
              <span className="text-xs font-medium text-white/75">{user.businessName}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sync indicator */}
        <SyncIndicator pending={sync.pending} rejected={sync.rejected} flagged={sync.flagged} offline={sync.offline} />

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mounted && resolvedTheme === 'dark' ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </button>

        {/* Notifications button */}
        <button
          type="button"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Notifications"
          onClick={() => {
            toast.dismiss();
            toast.info('No new notifications', { id: 'notifications-toast', description: "You're all caught up!" });
          }}
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-700 px-1 text-[9px] font-bold leading-none text-white" aria-hidden="true">0</span>
        </button>

        {/* Mobile menu button (only on mobile) */}
        <button
          type="button"
          onClick={onMenuClick}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop user menu and sign in */}
        <div className="hidden lg:flex lg:items-center lg:gap-3">
          {user ? (
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-white">{user.name}</p>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <Shield className="h-3 w-3 text-white/50" aria-hidden="true" />
                  <Badge variant="default" className="px-2 uppercase tracking-wide bg-white/10 text-white">
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="grid h-9 w-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="h-10 px-4 rounded-lg bg-white/10 text-white text-sm font-medium transition-colors hover:bg-white/20"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="h-10 px-4 rounded-lg bg-brand-700 text-white text-sm font-medium transition-colors hover:bg-brand-800"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
