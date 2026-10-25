'use client';

import { AppLayout } from '@/components/layout';
import { Card, CardContent, TableSkeleton, Skeleton } from '@/components/ui';

export default function ReportsLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <TableSkeleton rows={8} cols={8} title="Reports Preview" description="Loading report metrics..." />
      </div>
    </AppLayout>
  );
}
