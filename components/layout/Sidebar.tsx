'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  AlertTriangle,
  RefreshCw,
  LogOut,
  Building,
} from 'lucide-react';
import { useAuth, type UserRole } from '@/lib/AuthContext';
import { Badge } from '../ui';
import { NavbarLogo } from '@/components/brand';
import { toast } from 'sonner';

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
  { label: 'Users', href: '/users', icon: Users, roles: ['owner'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'manager'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
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
    router.push('/login');
  };

  return (
    <aside className="hidden lg:flex lg:static z-50 flex h-full w-64 shrink-0 flex-col bg-brand-800 dark:bg-slate-900 dark:border-r dark:border-slate-800" aria-label="Main navigation">
      <div className="flex items-center justify-between border-b border-white/10 dark:border-slate-800 px-5 py-5">
        <NavbarLogo href={user?.role === 'admin' ? '/admin' : '/dashboard'} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && <Badge variant="info">{item.badge}</Badge>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-white/60">{user.email}</p>
              {user.businessName && (
                <p className="truncate text-[11px] text-white/70">{user.businessName}</p>
              )}
              <Badge variant="default" className="mt-1 bg-white/10 px-2 text-[10px] uppercase tracking-wide text-green-100">
                {user.role}
              </Badge>
            </div>
            <button
              onClick={handleLogout}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-white/50">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>RBAC enabled · 4 roles</span>
        </div>
      </div>
    </aside>
  );
}

export function SyncIndicator({ pending }: { pending: number }) {
  if (pending <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
      <RefreshCw className="h-3 w-3" />
      {pending} pending sync
    </span>
  );
}