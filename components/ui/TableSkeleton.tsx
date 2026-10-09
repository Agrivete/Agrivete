import { Card, CardHeader, CardContent } from '@/components/ui';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  title?: string;
  description?: string;
}

export function TableSkeleton({ rows = 5, cols = 5, title = 'Loading...', description = 'Please wait' }: TableSkeletonProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} className="pb-0" />
      <CardContent className="p-0">
        <div className="divide-y divide-slate-200">
          <div className="grid gap-4 p-4 bg-slate-50" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {[...Array(cols)].map((_, i) => (
              <div key={i} className="h-4 w-full bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
          {[...Array(rows)].map((_, rowIdx) => (
            <div key={rowIdx} className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
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