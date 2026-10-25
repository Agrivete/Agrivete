'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
  LogOut,
  Building,
  Shield,
} from 'lucide-react';
import { useAuth, type UserRole } from '@/lib/AuthContext';
import { Badge } from '../ui';
import { NavbarLogo } from '@/components/brand';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetDescription } from '@/components/ui/sheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  badge?: string;
}

const adminLinks: NavItem[] = [
  { label: 'Platform Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Businesses', href: '/admin/businesses', icon: Building },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const businessLinks: (NavItem & { roles: UserRole[] })[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'staff'] },
  { label: 'Sales', href: '/sales', icon: ShoppingCart, roles: ['owner', 'manager', 'staff'] },
  { label: 'Inventory', href: '/inventory', icon: Package, roles: ['owner', 'manager', 'staff'] },
  { label: 'Receiving', href: '/receiving', icon: PackageCheck, roles: ['owner', 'manager'] },
  { label: 'Expiration', href: '/expiration', icon: CalendarClock, roles: ['owner', 'manager', 'staff'] },
  { label: 'Suppliers', href: '/suppliers', icon: Truck, roles: ['owner', 'manager'] },
  { label: 'Supplier Directory', href: '/suppliers/directory', icon: Truck, roles: ['owner', 'manager', 'staff'] },
  { label: 'Replenishments', href: '/replenishments', icon: ClipboardList, roles: ['owner', 'manager'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['owner', 'manager'] },
  { label: 'Staff Management', href: '/users', icon: Users, roles: ['owner'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'manager'] },
];

export function MobileDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? adminLinks
    : user
      ? businessLinks.filter((item) => item.roles.includes(user.role))
      : [];

  const handleLogout = async () => {
    await logout();
    toast.dismiss();
    toast.success('Signed out', { id: 'auth-toast', description: 'You have been signed out successfully.' });
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex h-full w-[85vw] max-w-[320px] flex-col p-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        {/* Header with High-Contrast Logo and Accessible Close Button */}
        <SheetHeader className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <NavbarLogo
            href={user?.role === 'admin' ? '/admin' : '/dashboard'}
            variant="dark"
          />
          <SheetDescription className="sr-only">Main mobile navigation drawer</SheetDescription>
        </SheetHeader>

        {/* Scrollable Navigation Links with Active State Highlighting */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main mobile navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard' || pathname === '/'
                : item.href === '/admin'
                  ? pathname === '/admin'
                  : item.href === '/suppliers'
                    ? pathname === '/suppliers'
                    : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => onOpenChange(false)}
                className={`group flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-900 font-semibold border-l-4 border-brand-600 dark:bg-brand-950/70 dark:text-brand-300 dark:border-brand-500 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  }`}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <Badge variant="info" className="ml-auto text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: Current User Profile, Role Badge, and Sign Out */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">
                {user.name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge
                    variant="default"
                    className="bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  >
                    {user.role}
                  </Badge>
                  {user.businessName && (
                    <span className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      · {user.businessName}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-brand-600 dark:text-brand-400" />
              <span>RBAC enforced · 4 roles</span>
            </span>
            <span className="font-mono text-[10px]">v1.0.1</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
