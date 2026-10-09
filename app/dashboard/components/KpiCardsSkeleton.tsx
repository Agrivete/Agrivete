import { Card, CardContent } from '@/components/ui';

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200 animate-pulse" />
        <div className="min-w-0">
          <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-1" />
          <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCardsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    </>
  );
}