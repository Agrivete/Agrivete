'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, ShoppingCart, Search, Ban } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card, CardHeader, CardContent, Table, Badge, StatusBadge, Button, Input, Select, Modal, Pagination, EmptyState, PageLoader, ConfirmModal,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';

interface SaleRow {
  saleId: string;
  date: string;
  customerName: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  unitCost?: number;
}

interface ProductOption {
  productId: string;
  name: string;
  sellingPrice: number;
  quantityOnHand: number;
  unit: string;
}

interface SaleFormItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function SalesPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [saleModal, setSaleModal] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<SaleFormItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<SaleRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<{ sales: SaleRow[]; total: number; pages: number }>(`/api/sales?${params}`);
      setSales(res.sales);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load sales', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openSaleModal = async () => {
    try {
      const prods = await api.get<ProductOption[]>('/api/products?withStock=true');
      setProducts(prods.filter((p) => p.quantityOnHand > 0));
      setItems([]);
      setPaymentMethod('cash');
      setCustomerName('');
      setDiscount('0');
      setSaleModal(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load products', 'error');
    }
  };

  const addItem = () => setItems([...items, { productId: '', productName: '', quantity: 1, unitPrice: 0 }]);

  const updateItem = (index: number, patch: Partial<SaleFormItem>) => {
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const onProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.productId === productId);
    updateItem(index, {
      productId,
      productName: prod?.name || '',
      unitPrice: prod?.sellingPrice || 0,
    });
  };

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const totalAmount = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const submitSale = async (e: FormEvent) => {
    e.preventDefault();
    if (!items.length || items.some((it) => !it.productId || it.quantity < 1)) {
      toast('Add at least one valid item', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/sales', {
        items: items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })),
        paymentMethod,
        customerName,
        discount: parseFloat(discount) || 0,
      });
      toast('Sale recorded — inventory deducted (BR01)', 'success');
      setSaleModal(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record sale', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/api/sales/${cancelTarget.saleId}`, { action: 'cancel' });
      toast('Sale cancelled — inventory restored', 'success');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel sale', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sales & Transactions</h2>
            <p className="text-xs text-slate-500">{total} total transactions</p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openSaleModal}>
            New Sale
          </Button>
        </div>

        <Card className="min-h-0">
          <CardHeader
            title="Transactions"
            description="Completed sales auto-deduct stock (BR01)"
            className="sm:[&>div:last-child]:shrink-0"
            action={
              <div className="flex w-full flex-col gap-2 sm:w-max sm:flex-row sm:items-center sm:gap-2">
                <div className="relative w-full sm:w-64 sm:shrink-0">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Search..."
                    className="h-11 w-full rounded-lg border border-slate-300 pl-8 pr-2 text-xs"
                  />
                </div>
                <div className="w-full sm:w-44 sm:shrink-0">
                  <Select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    options={[
                      { value: 'completed', label: 'Completed' },
                      { value: 'cancelled', label: 'Cancelled' },
                      { value: 'refunded', label: 'Refunded' },
                    ]}
                    placeholder="All statuses"
                    className="h-11 w-full text-xs"
                  />
                </div>
              </div>
            }
          />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader />
            ) : (
              <Table
                columns={[
                  { key: 'saleId', header: 'Sale ID', accessor: (r) => <code className="text-xs text-slate-500">{r.saleId}</code> },
                  { key: 'customerName', header: 'Customer', accessor: (r) => r.customerName || 'Walk-in' },
                  { key: 'items', header: 'Items', accessor: (r) => r.items.reduce((s, i) => s + i.quantity, 0) },
                  { key: 'date', header: 'Date', accessor: (r) => new Date(r.date).toLocaleString('en-PH') },
                  ...(hasRole('owner')
                    ? [{ key: 'subtotal', header: 'Subtotal', accessor: (r: SaleRow) => `₱${r.subtotal.toFixed(2)}` }]
                    : []),
                  { key: 'total', header: 'Total', accessor: (r) => <span className="font-semibold">₱{r.total.toFixed(2)}</span> },
                  { key: 'paymentMethod', header: 'Payment', accessor: (r) => <StatusBadge status={r.paymentMethod} /> },
                  { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
                  {
                    key: 'actions', header: '',
                    accessor: (r) =>
                      r.status === 'completed' && hasRole('owner', 'manager') ? (
                        <Button size="sm" variant="ghost" onClick={() => setCancelTarget(r)}>
                          <Ban className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      ) : null,
                  },
                ]}
                data={sales}
                keyExtractor={(r) => r.saleId}
                emptyMessage="No transactions found"
              />
            )}
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </CardContent>
        </Card>
      </div>

      <Modal
        open={saleModal}
        onClose={() => setSaleModal(false)}
        title="Record Sale"
        description="Stock is deducted automatically when the sale completes"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaleModal(false)}>Cancel</Button>
            <Button onClick={submitSale} loading={submitting} leftIcon={<ShoppingCart className="h-4 w-4" />}>
              Complete Sale — ₱{totalAmount.toFixed(2)}
            </Button>
          </>
        }
      >
        <form onSubmit={submitSale} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer name" placeholder="Walk-in" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card' },
                  { value: 'gcash', label: 'GCash' },
                  { value: 'credit', label: 'Credit' },
                ]}
              />
              <Input label="Discount (₱)" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-700">Items</span>
              <Button size="sm" variant="outline" type="button" onClick={addItem} leftIcon={<Plus className="h-3 w-3" />}>
                Add item
              </Button>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3">
              {items.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">No items yet — click “Add item”</p>
              )}
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-5">
                    <Select
                      label="Product"
                      value={item.productId}
                      onChange={(e) => onProductChange(index, e.target.value)}
                      options={products.map((p) => ({
                        value: p.productId,
                        label: `${p.name} (${p.quantityOnHand} ${p.unit})`,
                      }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Qty"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Price"
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-2 pb-1 text-xs text-slate-500">
                    ₱{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                  </div>
                  <div className="col-span-1 pb-1 text-right">
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm">
              <span className="text-xs text-slate-500">Subtotal</span>
              <span className="font-semibold">₱{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel sale"
        message={`Cancel sale ${cancelTarget?.saleId}? The items will be returned to inventory.`}
        confirmLabel="Cancel sale"
        loading={cancelling}
      />
    </AppLayout>
  );
}
