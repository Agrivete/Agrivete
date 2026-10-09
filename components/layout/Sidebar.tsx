'use client';

import { usePathname } from 'next/navigation';
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
  Leaf,
  AlertTriangle,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { useAuth, type UserRole } from '@/lib/AuthContext';
import { Badge } from '../ui';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'staff'] },
  { label: 'Sales', href: '/sales', icon: ShoppingCart, roles: ['owner', 'manager', 'staff'] },
  { label: 'Inventory', href: '/inventory', icon: Package, roles: ['owner', 'manager', 'staff'] },
  { label: 'Receiving', href: '/receiving', icon: PackageCheck, roles: ['owner', 'manager'] },
  { label: 'Expiration', href: '/expiration', icon: CalendarClock, roles: ['owner', 'manager', 'staff'] },
  { label: 'Suppliers', href: '/suppliers', icon: Truck, roles: ['owner', 'manager'] },
  { label: 'Replenishments', href: '/replenishments', icon: ClipboardList, roles: ['owner', 'manager'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['owner', 'manager'] },
  { label: 'Users', href: '/users', icon: Users, roles: ['owner'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'manager'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-brand-800">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Agrivet</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
            Management System
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard' || pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && <Badge variant="info">{item.badge}</Badge>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>RBAC enabled · 3 roles</span>
        </div>
      </div>
    </aside>
  );
}

export function MobileNavWarning() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
      <CloudOff className="h-4 w-4" />
      Full navigation requires a wider viewport.
    </div>
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
