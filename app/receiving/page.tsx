'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, PackageCheck, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card, CardHeader, CardContent, Table, Badge, StatusBadge, Button, Input, Select, Modal, Pagination, PageLoader, ConfirmModal, EmptyState,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

interface ReceivingRow {
  receivingId: string;
  supplierId: string;
  supplierName: string;
  referenceNo: string;
  receivedDate: string;
  status: string;
  items: Array<{
    productId: string;
    productName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitCost: number;
    lotNo: string;
    expirationDate?: string;
  }>;
  totalCost: number;
  purchaseId?: string;
  confirmedBy?: string;
}

interface SupplierOption { supplierId: string; name: string }
interface ProductOption { productId: string; name: string; unit: string }

interface ReceivingItemForm {
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  lotNo: string;
  expirationDate: string;
}

export default function ReceivingPage() {
  const { hasRole } = useAuth();

  const [receivings, setReceivings] = useState<ReceivingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [purchaseId, setPurchaseId] = useState('');
  const [items, setItems] = useState<ReceivingItemForm[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<ReceivingRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ receivings: ReceivingRow[]; total: number; pages: number }>(
        `/api/receiving?page=${page}&limit=15`
      );
      setReceivings(res.receivings);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load receivings');
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

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
      setSupplierId('');
      setReferenceNo('');
      setPurchaseId('');
      setItems([]);
      setModal(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const addItem = () =>
    setItems([...items, { productId: '', productName: '', orderedQuantity: 1, receivedQuantity: 1, unitCost: 0, lotNo: '', expirationDate: '' }]);

  const updateItem = (index: number, patch: Partial<ReceivingItemForm>) =>
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const onProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.productId === productId);
    updateItem(index, { productId, productName: prod?.name || '' });
  };

  const totalCost = items.reduce((s, it) => s + it.receivedQuantity * it.unitCost, 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplierId || !referenceNo.trim()) {
      toast.error('Supplier and reference number are required');
      return;
    }
    if (!items.length || items.some((it) => !it.productId || !it.lotNo.trim())) {
      toast.error('Add at least one item with product and lot number');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/receiving', {
        supplierId,
        referenceNo,
        purchaseId: purchaseId || undefined,
        receivedDate: new Date().toISOString(),
        items: items.map((it) => ({
          productId: it.productId,
          orderedQuantity: it.orderedQuantity,
          receivedQuantity: it.receivedQuantity,
          unitCost: it.unitCost,
          lotNo: it.lotNo,
          expirationDate: it.expirationDate || undefined,
        })),
      });
      toast.success('Receiving recorded — stock increased (BR02)');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record receiving');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/api/receiving/${cancelTarget.receivingId}`, { action: 'cancel' });
      toast.success('Receiving cancelled — stock reversed');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel receiving');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Stock Receiving</h2>
            <p className="text-xs text-slate-500">Incoming stock with lot / expiration traceability</p>
          </div>
          {hasRole('owner', 'manager') && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openModal}>
              Record Receiving
            </Button>
          )}
        </div>

        <Card>
          <CardHeader title="Receipts" description="BR02: stock increases only for confirmed receipts" />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader />
            ) : (
              <Table
                columns={[
                  { key: 'receivingId', header: 'Receiving ID', accessor: (r) => <code className="text-xs text-slate-500">{r.receivingId}</code> },
                  { key: 'referenceNo', header: 'Reference #', accessor: (r) => <span className="font-medium">{r.referenceNo}</span> },
                  { key: 'supplierName', header: 'Supplier', accessor: (r) => r.supplierName },
                  { key: 'items', header: 'Items', accessor: (r) => r.items.reduce((s, i) => s + i.receivedQuantity, 0) },
                  { key: 'totalCost', header: 'Total Cost', accessor: (r) => <span className="font-semibold">₱{r.totalCost.toFixed(2)}</span> },
                  { key: 'receivedDate', header: 'Received', accessor: (r) => new Date(r.receivedDate).toLocaleDateString('en-PH') },
                  { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
                  {
                    key: 'actions', header: '',
                    accessor: (r) =>
                      r.status !== 'cancelled' && hasRole('owner') ? (
                        <Button size="sm" variant="ghost" onClick={() => setCancelTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      ) : null,
                  },
                ]}
                data={receivings}
                keyExtractor={(r) => r.receivingId}
                emptyMessage="No receipts yet"
              />
            )}
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </CardContent>
        </Card>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Record Stock Receiving"
        description="Lot numbers and expiration dates are recorded per item"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={submit} loading={submitting} leftIcon={<PackageCheck className="h-4 w-4" />}>
              Confirm & Receive — ₱{totalCost.toFixed(2)}
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
              options={suppliers.map((s) => ({ value: s.supplierId, label: s.name }))}
              required
            />
            <Input label="Reference # (invoice / delivery receipt)" required value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="INV-0001" />
          </div>
          <Input label="Linked purchase order ID (optional)" value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)} placeholder="PUR-..." />

          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-700">Items</span>
              <Button size="sm" variant="outline" type="button" onClick={addItem} leftIcon={<Plus className="h-3 w-3" />}>
                Add item
              </Button>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-3">
              {items.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No items yet</p>}
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-4">
                    <Select
                      label="Product"
                      value={item.productId}
                      onChange={(e) => onProductChange(index, e.target.value)}
                      options={products.map((p) => ({ value: p.productId, label: `${p.name} (${p.unit})` }))}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input label="Ord." type="number" min="1" value={item.orderedQuantity} onChange={(e) => updateItem(index, { orderedQuantity: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-1">
                    <Input label="Recv." type="number" min="0" value={item.receivedQuantity} onChange={(e) => updateItem(index, { receivedQuantity: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-1">
                    <Input label="Cost" type="number" min="0" value={item.unitCost} onChange={(e) => updateItem(index, { unitCost: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-2">
                    <Input label="Lot #" required value={item.lotNo} onChange={(e) => updateItem(index, { lotNo: e.target.value })} placeholder="LOT-..." />
                  </div>
                  <div className="col-span-2">
                    <Input label="Expires" type="date" value={item.expirationDate} onChange={(e) => updateItem(index, { expirationDate: e.target.value })} />
                  </div>
                  <div className="col-span-1 pb-1 text-right">
                    <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-xs text-red-500 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm">
              <span className="text-xs text-slate-500">Total cost</span>
              <span className="font-semibold">₱{totalCost.toFixed(2)}</span>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel receiving"
        message={`Cancel receipt ${cancelTarget?.receivingId}? Received stock will be reversed from inventory.`}
        confirmLabel="Cancel receipt"
        loading={cancelling}
      />
    </AppLayout>
  );
}
