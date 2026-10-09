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

function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-200">
          <div className="grid grid-cols-5 gap-4 p-4 bg-slate-50">
            {[...Array(cols)].map((_, i) => (
              <div key={i} className="h-4 w-full bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
          {[...Array(rows)].map((_, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-5 gap-4 p-4">
              {[...Array(cols)].map((_, colIdx) => (
                <div key={colIdx} className="h-4 w-full bg-slate-200 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableSkeleton rows={5} cols={5} />
        <TableSkeleton rows={5} cols={4} />
      </div>
      <TableSkeleton rows={5} cols={7} />
    </div>
  );
}