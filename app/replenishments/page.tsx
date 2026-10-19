'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, ClipboardList, Ban } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card, CardHeader, CardContent, Table, Badge, StatusBadge, Button, Input, Select, Modal, Pagination, PageLoader, ConfirmModal, EmptyState,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

interface Replenishment {
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  status: string;
  items: Array<{ productId: string; productName: string; orderedQuantity: number; receivedQuantity: number; unitCost: number }>;
  subtotal: number;
  total: number;
  referenceNo?: string;
  notes?: string;
}

interface SupplierOption {
  supplierId: string;
  name: string;
  availableDays?: string[];
  lastDeliveryDate?: string | null;
}
interface ProductOption { productId: string; name: string; unit: string }

interface ItemForm { productId: string; productName: string; orderedQuantity: number; unitCost: number }

export default function ReplenishmentsPage() {
  const { hasRole } = useAuth();

  const [replenishments, setReplenishments] = useState<Replenishment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [statusTarget, setStatusTarget] = useState<Replenishment | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<{ replenishments: Replenishment[]; total: number; pages: number }>(`/api/replenishments?${params}`);
      setReplenishments(res.replenishments);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load replenishments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = async () => {
    try {
      const [sups, prods] = await Promise.all([
        api.get<SupplierOption[]>('/api/suppliers'),
        api.get<ProductOption[]>('/api/products'),
      ]);
      setSuppliers(sups);
      setProducts(prods);
      setSupplierId(''); setExpectedDate(''); setReferenceNo(''); setItems([]);
      setModal(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const addItem = () => setItems([...items, { productId: '', productName: '', orderedQuantity: 1, unitCost: 0 }]);

  const updateItem = (index: number, patch: Partial<ItemForm>) =>
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const onProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.productId === productId);
    updateItem(index, { productId, productName: prod?.name || '' });
  };

  const totalAmount = items.reduce((s, it) => s + it.orderedQuantity * it.unitCost, 0);

  const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  const isAvailableToday = (s: SupplierOption) => {
    const days = s.availableDays && s.availableDays.length > 0
      ? s.availableDays
      : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const availableByDay = days.includes(todayKey);
    const deliveredLast24h = s.lastDeliveryDate
      ? Date.now() - new Date(s.lastDeliveryDate).getTime() <= 24 * 60 * 60 * 1000
      : false;
    return availableByDay || deliveredLast24h;
  };
  const availableSuppliers = suppliers.filter(isAvailableToday);
  const unavailableSuppliers = suppliers.filter((s) => !isAvailableToday(s));
  const supplierOptions = [
    ...availableSuppliers.map((s) => ({ value: s.supplierId, label: s.name })),
    ...(unavailableSuppliers.length > 0
      ? [
          { value: '__divider_unavailable__', label: '── Unavailable today ──', disabled: true },
          ...unavailableSuppliers.map((s) => ({ value: s.supplierId, label: s.name })),
        ]
      : []),
  ];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplierId || !items.length || items.some((it) => !it.productId)) {
      toast.error('Supplier and at least one item are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/replenishments', {
        supplierId,
        orderDate: new Date().toISOString(),
        expectedDate: expectedDate || undefined,
        referenceNo: referenceNo || undefined,
        items: items.map((it) => ({ productId: it.productId, orderedQuantity: it.orderedQuantity, unitCost: it.unitCost })),
      });
      toast.success('Purchase order created');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async () => {
    if (!statusTarget || !newStatus) return;
    setCancelling(true);
    try {
      await api.patch(`/api/replenishments/${statusTarget.purchaseId}`, { status: newStatus });
      toast.success(`PO marked ${newStatus}`);
      setStatusTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Replenishments</h2>
            <p className="text-xs text-slate-500">Purchase orders & expected delivery tracking</p>
          </div>
          {hasRole('owner', 'manager') && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openModal}>
              New Purchase Order
            </Button>
          )}
        </div>

        <Card>
          <CardHeader
            title="Purchase Orders"
            action={
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'received', label: 'Received' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                placeholder="All statuses"
                className="h-8 w-36 text-xs"
              />
            }
          />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader />
            ) : (
              <Table
                columns={[
                  { key: 'purchaseId', header: 'PO #', accessor: (r) => <code className="text-xs text-slate-500">{r.purchaseId}</code> },
                  { key: 'supplierName', header: 'Supplier', accessor: (r) => <span className="font-medium">{r.supplierName}</span> },
                  { key: 'items', header: 'Items', accessor: (r) => r.items.reduce((s, i) => s + i.orderedQuantity, 0) },
                  { key: 'total', header: 'Total', accessor: (r) => <span className="font-semibold">₱{r.total.toFixed(2)}</span> },
                  { key: 'orderDate', header: 'Ordered', accessor: (r) => new Date(r.orderDate).toLocaleDateString('en-PH') },
                  { key: 'expectedDate', header: 'Expected', accessor: (r) => r.expectedDate ? new Date(r.expectedDate).toLocaleDateString('en-PH') : '—' },
                  { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
                  {
                    key: 'actions', header: '',
                    accessor: (r) =>
                      r.status !== 'received' && r.status !== 'cancelled' && hasRole('owner', 'manager') ? (
                        <Button size="sm" variant="ghost" onClick={() => { setStatusTarget(r); setNewStatus(r.status === 'pending' ? 'partial' : 'received'); }}>
                          Update
                        </Button>
                      ) : r.status !== 'cancelled' && hasRole('owner') ? (
                        <Button size="sm" variant="ghost" onClick={() => { setStatusTarget(r); setNewStatus('cancelled'); }}>
                          <Ban className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      ) : null,
                  },
                ]}
                data={replenishments}
                keyExtractor={(r) => r.purchaseId}
                emptyMessage="No purchase orders"
              />
            )}
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </CardContent>
        </Card>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New Purchase Order"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={submit} loading={submitting} leftIcon={<ClipboardList className="h-4 w-4" />}>
              Create PO — ₱{totalAmount.toFixed(2)}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={supplierOptions}
              required
            />
            <Input label="Expected delivery" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
          <Input label="Reference # (optional)" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />

          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-700">Items</span>
              <Button size="sm" variant="outline" type="button" onClick={addItem} leftIcon={<Plus className="h-3 w-3" />}>
                Add item
              </Button>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3">
              {items.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No items yet</p>}
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-6">
                    <Select
                      label="Product"
                      value={item.productId}
                      onChange={(e) => onProductChange(index, e.target.value)}
                      options={products.map((p) => ({ value: p.productId, label: `${p.name} (${p.unit})` }))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input label="Quantity" type="number" min="1" value={item.orderedQuantity} onChange={(e) => updateItem(index, { orderedQuantity: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-2">
                    <Input label="Unit cost" type="number" min="0" value={item.unitCost} onChange={(e) => updateItem(index, { unitCost: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-1 pb-1 text-right">
                    <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-xs text-red-500 hover:text-red-700">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm">
              <span className="text-xs text-slate-500">Order total</span>
              <span className="font-semibold">₱{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title="Update PO Status"
        description={statusTarget?.purchaseId}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button onClick={updateStatus} loading={cancelling}>Update</Button>
          </>
        }
      >
        <Select
          label="Status"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'partial', label: 'Partial' },
            { value: 'received', label: 'Received' },
            ...(hasRole('owner') ? [{ value: 'cancelled', label: 'Cancelled' }] : []),
          ]}
        />
      </Modal>
    </AppLayout>
  );
}
