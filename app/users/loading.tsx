'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function UsersLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={6} cols={5} title="User Management" description="Loading team accounts..." />
      </div>
    </AppLayout>
  );
}
