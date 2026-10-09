import { Card, CardContent } from '@/components/ui';
import { TableSkeleton } from '@/components/ui';

function FormSkeleton() {
  return (
    <Card>
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

export default function ReportsLoading() {
  return (
    <div className="space-y-6 p-6">
      <FormSkeleton />
      <TableSkeleton rows={10} cols={8} title="Report Data" description="Generated report rows" />
    </div>
  );
}