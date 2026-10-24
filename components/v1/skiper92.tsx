'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  LayoutDashboard,
  ShoppingCart,
  Package,
  PackageCheck,
  CalendarClock,
  Truck,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Building,
  CornerDownLeft,
  ArrowUpDown,
} from 'lucide-react';
import { useAuth, type UserRole } from '@/lib/AuthContext';

export interface CommandPaletteItem {
  id: string;
  label: string;
  description: string;
  href: string;
  group: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const DEFAULT_COMMANDS: CommandPaletteItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Executive overview, KPIs, and revenue charts',
    href: '/dashboard',
    group: 'Navigation',
    keywords: ['home', 'overview', 'kpi', 'analytics', 'dashboard'],
    icon: LayoutDashboard,
    roles: ['owner', 'manager', 'staff'],
  },
  {
    id: 'sales',
    label: 'Sales & POS Checkout',
    description: 'Record counter sales and print customer receipts',
    href: '/sales',
    group: 'Navigation',
    keywords: ['pos', 'checkout', 'counter', 'receipt', 'sell', 'sales'],
    icon: ShoppingCart,
    roles: ['owner', 'manager', 'staff'],
  },
  {
    id: 'inventory',
    label: 'Inventory & Adjustments',
    description: 'Inspect stock balances, movements, and adjustments',
    href: '/inventory',
    group: 'Navigation',
    keywords: ['inv', 'stock', 'products', 'balance', 'adjustments', 'inventory'],
    icon: Package,
    roles: ['owner', 'manager', 'staff'],
  },
  {
    id: 'receiving',
    label: 'Stock Receiving',
    description: 'Record incoming supplier deliveries and lot numbers',
    href: '/receiving',
    group: 'Operations',
    keywords: ['receive', 'intake', 'delivery', 'lot', 'receiving'],
    icon: PackageCheck,
    roles: ['owner', 'manager'],
  },
  {
    id: 'expiration',
    label: 'Expiration Tracking (FEFO)',
    description: 'Monitor 30-day expiring biologicals and feed lots',
    href: '/expiration',
    group: 'Operations',
    keywords: ['expiry', 'fefo', 'lots', 'expiring', 'alerts', 'expiration'],
    icon: CalendarClock,
    roles: ['owner', 'manager', 'staff'],
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    description: 'Manage vendor contacts and delivery schedules',
    href: '/suppliers',
    group: 'Procurement',
    keywords: ['vendors', 'suppliers', 'trucks', 'delivery'],
    icon: Truck,
    roles: ['owner', 'manager'],
  },
  {
    id: 'supplier-directory',
    label: 'Supplier Directory',
    description: 'Browse sourced products and alternate suppliers',
    href: '/suppliers/directory',
    group: 'Procurement',
    keywords: ['directory', 'alternatives', 'sourcing', 'vendors'],
    icon: Truck,
    roles: ['owner', 'manager', 'staff'],
  },
  {
    id: 'replenishments',
    label: 'Purchase Orders (Replenishments)',
    description: 'Create and track supplier purchase orders',
    href: '/replenishments',
    group: 'Procurement',
    keywords: ['po', 'purchase', 'orders', 'replenish', 'reorder'],
    icon: ClipboardList,
    roles: ['owner', 'manager'],
  },
  {
    id: 'reports',
    label: 'Reports & Exports',
    description: 'Stream CSV and PDF reports for sales and stock',
    href: '/reports',
    group: 'Analytics',
    keywords: ['csv', 'pdf', 'export', 'profit', 'reports'],
    icon: BarChart3,
    roles: ['owner', 'manager'],
  },
  {
    id: 'users',
    label: 'Staff Management',
    description: 'Provision and manage store employee accounts',
    href: '/users',
    group: 'Administration',
    keywords: ['staff', 'employees', 'users', 'roles', 'team'],
    icon: Users,
    roles: ['owner'],
  },
  {
    id: 'admin-dashboard',
    label: 'Platform Dashboard',
    description: 'Platform-wide tenant overview and system health',
    href: '/admin',
    group: 'Platform Admin',
    keywords: ['admin', 'platform', 'overview'],
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    id: 'admin-businesses',
    label: 'Registered Businesses',
    description: 'Approve or review store tenant registrations',
    href: '/admin/businesses',
    group: 'Platform Admin',
    keywords: ['businesses', 'tenants', 'approve', 'onboarding'],
    icon: Building,
    roles: ['admin'],
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Store preferences and offline sync queue status',
    href: '/settings',
    group: 'System',
    keywords: ['settings', 'preferences', 'sync', 'offline', 'queue', 'config'],
    icon: Settings,
    roles: ['owner', 'manager', 'admin'],
  },
];

export const OPEN_COMMAND_PALETTE_EVENT = 'agrivet:open-command-palette';

export function openCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
  }
}

export function Skiper92() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableItems = useMemo(() => {
    if (!user) return DEFAULT_COMMANDS.filter((item) => ['dashboard', 'sales', 'inventory', 'settings'].includes(item.id));
    return DEFAULT_COMMANDS.filter((item) => !item.roles || item.roles.includes(user.role));
  }, [user]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableItems;
    return availableItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  }, [availableItems, query]);

  const handleSelect = useCallback(
    (item: CommandPaletteItem) => {
      setOpen(false);
      setQuery('');
      router.push(item.href);
    },
    [router]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      const id = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => {
    const onCustomOpen = () => setOpen(true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onCustomOpen);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onCustomOpen);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (!open && !isEditable && !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (!open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
        );
      } else if (event.key === 'Enter' && filteredItems[selectedIndex]) {
        event.preventDefault();
        handleSelect(filteredItems[selectedIndex]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filteredItems, selectedIndex, handleSelect]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Search Input Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <Search className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search pages (e.g. 'inv', 'sales', 'settings')..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  No matching pages found for &ldquo;{query}&rdquo;.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`relative flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/70 dark:text-brand-100'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                              isSelected
                                ? 'border-brand-200 bg-brand-700 text-white dark:border-brand-700 dark:bg-brand-600'
                                : 'border-slate-200 bg-slate-50 text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-400'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{item.label}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {item.group}
                          </span>
                          {isSelected && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-brand-700 dark:text-brand-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Hints */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" /> Navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" /> Open
                </span>
              </div>
              <span>
                Press <kbd className="font-mono font-semibold text-brand-700 dark:text-brand-400">Ctrl+K</kbd> or{' '}
                <kbd className="font-mono font-semibold text-brand-700 dark:text-brand-400">F</kbd> anytime
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Skiper92;

