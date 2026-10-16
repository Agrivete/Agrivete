import { Card, CardContent } from '@/components/ui';

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="mb-2 h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="min-w-0">
          <div className="mb-1 h-8 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCardsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    </>
  );
}