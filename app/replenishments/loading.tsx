'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function ReplenishmentsLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={8} cols={6} title="Purchase Orders" description="Loading replenishments..." />
      </div>
    </AppLayout>
  );
}
