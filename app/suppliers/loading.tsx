import { TableSkeleton } from '@/components/ui';

export default function SuppliersLoading() {
  return (
    <div className="space-y-6 p-6">
      <TableSkeleton rows={10} cols={6} title="Suppliers" description="Supplier listings" />
    </div>
  );
}