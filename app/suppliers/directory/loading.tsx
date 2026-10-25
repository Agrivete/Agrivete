'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function SupplierDirectoryLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={8} cols={4} title="Supplier Directory" description="Loading catalog..." />
      </div>
    </AppLayout>
  );
}

