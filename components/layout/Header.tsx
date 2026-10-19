'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Bell, Shield, Menu } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '../ui';
import { SyncIndicator } from './Sidebar';
import { toast } from 'sonner';
import { NavbarLogo } from '@/components/brand';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/admin': 'Platform Admin',
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

  const pageTitle = PAGE_TITLES[pathname] || 'Dashboard';

  const handleLogout = async () => {
    await logout();
    toast('Signed out', { description: 'You have been signed out successfully.' });
    router.push('/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-brand-800 px-4 sm:px-6 lg:px-8">
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
        <SyncIndicator pending={0} />

        {/* Notifications button */}
        <button
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Notifications"
          onClick={() => toast('No new notifications', { description: "You're all caught up!" })}
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-700 px-1 text-[9px] font-bold leading-none text-white" aria-hidden="true">0</span>
        </button>

        {/* Mobile menu button (only on mobile) */}
        <button
          onClick={onMenuClick}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop user menu and sign in */}
        <div className="hidden lg:flex lg:items-center lg:gap-3">
          {user ? (
            <>
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
                  onClick={handleLogout}
                  className="grid h-9 w-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </div>
            </>
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