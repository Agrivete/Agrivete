'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Bell, Shield, Menu } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui';
import { SyncIndicator } from './Sidebar';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales & Transactions',
  '/inventory': 'Inventory Management',
  '/receiving': 'Stock Receiving',
  '/expiration': 'Expiration Monitoring',
  '/suppliers': 'Supplier Management',
  '/replenishments': 'Replenishments',
  '/reports': 'Reports & Analytics',
  '/users': 'User Management',
  '/settings': 'Settings',
};

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const title =
    Object.entries(TITLES).find(([prefix]) => path.startsWith(prefix))?.[1] ||
    'Agrivet';

  const handleLogout = async () => {
    await logout();
    toast('Signed out', 'info');
    router.push('/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="flex-1 text-base sm:text-lg font-semibold text-slate-900 truncate">{title}</h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <SyncIndicator pending={0} />

        <button
          className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:p-2"
          aria-label="Notifications"
          onClick={() => toast('No new notifications', 'info')}
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {user && (
          <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-900">{user.name}</p>
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <Shield className="h-3 w-3 text-slate-400" />
                <Badge variant={user.role === 'owner' ? 'default' : user.role === 'manager' ? 'info' : 'neutral'}>
                  {user.role}
                </Badge>
              </div>
            </div>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-brand-100 text-xs sm:text-sm font-bold text-brand-800">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}