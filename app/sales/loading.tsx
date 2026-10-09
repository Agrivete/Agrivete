import { TableSkeleton } from '@/components/ui';

export default function SalesLoading() {
  return (
    <div className="space-y-6 p-6">
      <TableSkeleton rows={10} cols={7} title="Sales" description="Recent transactions" />
    </div>
  );
}