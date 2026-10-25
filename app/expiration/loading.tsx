'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function ExpirationLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={10} cols={5} title="Expiration Tracking" description="Loading FEFO expiry batches..." />
      </div>
    </AppLayout>
  );
}
