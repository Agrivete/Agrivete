'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, LayoutDashboard, ShoppingCart, Package, PackageCheck, CalendarClock, Truck, ClipboardList, BarChart3, Users, Settings, LogOut, Building } from 'lucide-react';
import { useAuth, type UserRole } from '@/lib/AuthContext';
import { Badge } from '../ui';
import { NavbarLogo } from '@/components/brand';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? adminLinks
    : user
      ? businessLinks.filter((item) => item.roles.includes(user.role))
      : [];

  const handleLogout = async () => {
    await logout();
    toast('Signed out', { description: 'You have been signed out successfully.' });
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
      <SheetContent side="right" className="w-full max-w-[320px] sm:max-w-[320px] p-0 dark:bg-slate-900 dark:border-slate-800">
        <SheetHeader className="flex items-center justify-between border-b border-neutral-200 dark:border-slate-800 px-5 py-5">
          <NavbarLogo href={user?.role === 'admin' ? '/admin' : '/dashboard'} />
          <SheetDescription className="sr-only">Main navigation drawer</SheetDescription>
        </SheetHeader>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => onOpenChange(false)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                <span className="flex-1">{item.label}</span>
                {item.badge && <Badge variant="info">{item.badge}</Badge>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 p-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                <Badge variant="default" className="mt-1 bg-brand-50 px-2 text-[10px] uppercase tracking-wide text-brand-700">
                  {user.role}
                </Badge>
              </div>
              <button
                onClick={handleLogout}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
            <span>RBAC enabled · 4 roles</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}