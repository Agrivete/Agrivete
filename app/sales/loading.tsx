'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function SalesLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={10} cols={7} title="Sales & Checkout" description="Loading transactions..." />
      </div>
    </AppLayout>
  );
}
