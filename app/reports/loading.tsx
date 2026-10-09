import { Card, CardHeader, CardContent, Table } from '@/components/ui';

function FormSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 8, cols = 8 }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-200">
          <div className="grid grid-cols-8 gap-4 p-4 bg-slate-50">
            {[...Array(cols)].map((_, i) => (
              <div key={i} className="h-4 w-full bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
          {[...Array(rows)].map((_, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-8 gap-4 p-4">
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

export default function ReportsLoading() {
  return (
    <div className="space-y-6 p-6">
      <FormSkeleton />
      <TableSkeleton rows={10} cols={8} />
    </div>
  );
}