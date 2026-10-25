'use client';

import { AppLayout } from '@/components/layout';
import { TableSkeleton } from '@/components/ui';

export default function AdminLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <TableSkeleton rows={5} cols={4} title="Platform Administration" description="Loading platform overview..." />
      </div>
    </AppLayout>
  );
}

