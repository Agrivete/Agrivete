import { TableSkeleton } from '@/components/ui';

export default function ReceivingLoading() {
  return (
    <div className="space-y-6 p-6">
      <TableSkeleton rows={10} cols={6} title="Receiving" description="Stock receipts" />
    </div>
  );
}