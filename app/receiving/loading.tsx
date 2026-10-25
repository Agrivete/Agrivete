'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function ReceivingLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={10} cols={6} title="Stock Receiving" description="Loading intake receipts..." />
      </div>
    </AppLayout>
  );
}
