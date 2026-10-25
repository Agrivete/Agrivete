'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function AdminBusinessesLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={8} cols={5} title="Registered Businesses" description="Loading businesses..." />
      </div>
    </AppLayout>
  );
}

