'use client';

import { useCallback, useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  StatusBadge,
  PageLoader,
  EmptyState,
  type Column,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

interface SupplierDirectoryRow {
  supplierId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  status: string;
  lastDeliveryDate?: string | null;
  monthlyPurchaseCount: number;
  monthlyPurchaseAmount?: number;
}

export default function SupplierDirectoryPage() {
  const { hasRole } = useAuth();
  const isOwner = hasRole('owner');

  const [suppliers, setSuppliers] = useState<SupplierDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SupplierDirectoryRow[]>('/api/suppliers?directory=true');
      setSuppliers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load supplier directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<SupplierDirectoryRow>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      accessor: (r) => <span className="font-medium text-slate-900">{r.name}</span>,
    },
    {
      key: 'contactPerson',
      header: 'Contact Person',
      accessor: (r) => r.contactPerson || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: (r) => r.phone || '—',
    },
    {
      key: 'status',
      header: 'Active Status',
      accessor: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'lastDeliveryDate',
      header: 'Last Delivery Date',
      accessor: (r) =>
        r.lastDeliveryDate ? new Date(r.lastDeliveryDate).toLocaleDateString('en-PH') : '—',
    },
    {
      key: 'monthlyPurchaseCount',
      header: 'Purchases This Month',
      accessor: (r) => r.monthlyPurchaseCount ?? 0,
    },
  ];

  if (isOwner) {
    columns.push({
      key: 'monthlyPurchaseAmount',
      header: 'Total Purchases This Month (₱)',
      accessor: (r) => `₱${(r.monthlyPurchaseAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    });
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Supplier Directory</h2>
            <p className="text-xs text-slate-500">
              Read-only directory of suppliers, recent deliveries, and monthly purchase activity
            </p>
          </div>
        </div>

        <Card>
          <CardHeader title="All Suppliers" description={`${suppliers.length} suppliers listed`} />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader />
            ) : suppliers.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-7 w-7" />}
                title="No suppliers found"
                message="Suppliers added in Supplier Management will appear here."
              />
            ) : (
              <Table
                columns={columns}
                data={suppliers}
                keyExtractor={(r) => r.supplierId}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
