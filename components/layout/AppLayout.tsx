'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Sidebar, Header, MobileDrawer } from '.';
import { PageLoader } from '../ui';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [loading, user, router]);

  if (loading && !user) {
    return (
      <div className="app-background flex min-h-screen items-center justify-center page-transition">
        <PageLoader label="Loading Agrivet..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-background flex min-h-screen lg:h-screen lg:overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} />
      <MobileDrawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-300">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onMenuClick={() => setMobileDrawerOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8">
          <div className="page-transition">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
