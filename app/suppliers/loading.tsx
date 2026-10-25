'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function SuppliersLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={8} cols={5} title="Suppliers" description="Loading supplier records..." />
      </div>
    </AppLayout>
  );
}