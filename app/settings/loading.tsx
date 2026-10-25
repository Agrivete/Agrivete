'use client';

import { AppLayout } from '@/components/layout';
import { Card, CardHeader, CardContent, Skeleton } from '@/components/ui';

export default function SettingsLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader title="General Settings" description="Loading configuration..." className="pb-0" />
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Security & Governance" description="Loading access controls..." className="pb-0" />
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
