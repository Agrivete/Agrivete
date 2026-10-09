import { TableSkeleton } from '@/components/ui';

export default function ExpirationLoading() {
  return (
    <div className="space-y-6 p-6">
      <TableSkeleton rows={10} cols={5} title="Expiration" description="Expiring products" />
    </div>
  );
}