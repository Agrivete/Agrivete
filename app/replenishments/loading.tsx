import { TableSkeleton } from '@/components/ui';

export default function ReplenishmentsLoading() {
  return (
    <div className="space-y-6 p-6">
      <TableSkeleton rows={10} cols={6} title="Replenishments" description="Replenishment orders" />
    </div>
  );
}