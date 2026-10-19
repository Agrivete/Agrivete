import { Card, CardHeader, CardContent } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  title?: string;
  description?: string;
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
  title = 'Loading...',
  description = 'Please wait',
}: TableSkeletonProps) {
  return (
    <Card className="overflow-hidden">
      {title && (
        <CardHeader title={title} description={description} className="pb-3" />
      )}
      <CardContent className="p-0">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          <div
            className="grid gap-4 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/80"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {[...Array(cols)].map((_, i) => (
              <Skeleton key={`head-${i}`} className="h-3.5 w-full" />
            ))}
          </div>
          {[...Array(rows)].map((_, rowIdx) => (
            <div
              key={`row-${rowIdx}`}
              className="grid gap-4 px-5 py-3.5 bg-white dark:bg-slate-900"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {[...Array(cols)].map((_, colIdx) => (
                <Skeleton
                  key={`cell-${rowIdx}-${colIdx}`}
                  className="h-4 w-full"
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}