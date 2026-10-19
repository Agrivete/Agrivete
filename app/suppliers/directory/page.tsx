'use client';

import { useCallback, useEffect, useState } from 'react';
import { Truck, Package } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  Badge,
  StatusBadge,
  Button,
  PageLoader,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

interface SupplierInventoryProduct {
  productId: string;
  productName: string;
  category: string;
  totalReceived: number;
  currentOnHand: number;
  lastDeliveryDate: string;
  lastUnitCost?: number;
}

interface SupplierInventoryResponse {
  supplier: {
    supplierId: string;
    name: string;
    contactPerson: string;
    phone: string;
  };
  products: SupplierInventoryProduct[];
}

export default function SupplierDirectoryPage() {
  const { hasRole } = useAuth();
  const isOwner = hasRole('owner');

  const [suppliers, setSuppliers] = useState<SupplierDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [invTarget, setInvTarget] = useState<SupplierDirectoryRow | null>(null);
  const [invProducts, setInvProducts] = useState<SupplierInventoryProduct[]>([]);
  const [invLoading, setInvLoading] = useState(false);

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

  const openInventory = async (row: SupplierDirectoryRow) => {
    setInvTarget(row);
    setInvProducts([]);
    setInvLoading(true);
    try {
      const res = await api.get<SupplierInventoryResponse>(`/api/suppliers/${row.supplierId}/inventory`);
      setInvProducts(res.products || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load supplier inventory');
    } finally {
      setInvLoading(false);
    }
  };

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

  columns.push({
    key: 'inventory',
    header: 'Inventory',
    accessor: (r) => (
      <Button
        size="sm"
        variant="outline"
        leftIcon={<Package className="h-3.5 w-3.5" />}
        onClick={() => openInventory(r)}
      >
        View inventory
      </Button>
    ),
  });

  const invColumns: Column<SupplierInventoryProduct>[] = [
    {
      key: 'productName',
      header: 'Product',
      accessor: (r) => <span className="font-medium text-slate-900">{r.productName}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (r) => <Badge variant="neutral">{r.category}</Badge>,
    },
    {
      key: 'totalReceived',
      header: 'Total Received',
      accessor: (r) => r.totalReceived,
    },
    {
      key: 'currentOnHand',
      header: 'Current On Hand',
      accessor: (r) => <span className="font-semibold text-slate-900">{r.currentOnHand}</span>,
    },
    {
      key: 'lastDeliveryDate',
      header: 'Last Delivery',
      accessor: (r) =>
        r.lastDeliveryDate ? new Date(r.lastDeliveryDate).toLocaleDateString('en-PH') : '—',
    },
  ];

  if (isOwner) {
    invColumns.push({
      key: 'lastUnitCost',
      header: 'Last Unit Cost',
      accessor: (r) => `₱${(r.lastUnitCost ?? 0).toFixed(2)}`,
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

      <Dialog open={!!invTarget} onOpenChange={(open) => !open && setInvTarget(null)}>
        <DialogContent className="h-dvh max-w-full overflow-y-auto sm:h-auto sm:max-h-[85vh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Supplier Inventory — {invTarget?.name}</DialogTitle>
            <DialogDescription>
              Products delivered by {invTarget?.name}
            </DialogDescription>
          </DialogHeader>
          {invLoading ? (
            <PageLoader />
          ) : invProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No deliveries recorded from this supplier yet
            </p>
          ) : (
            <Table
              columns={invColumns}
              data={invProducts}
              keyExtractor={(r) => r.productId}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
