'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Search, Package, History, SlidersHorizontal } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card, CardHeader, CardContent, Table, Badge, Button, Input, Select, Modal, PageLoader, EmptyState,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';

interface BalanceRow {
  productId: string;
  name: string;
  category: string;
  unit: string;
  lowStockThreshold: number;
  quantityOnHand: number;
  isLowStock: boolean;
  lastMovementAt: string | null;
}

interface MovementRow {
  movementId: string;
  productId: string;
  type: string;
  quantity: number;
  referenceId: string;
  reason: string;
  userId: string;
  lotNo?: string;
  timestamp: string;
  notes?: string;
}

interface ProductForm {
  name: string;
  category: string;
  sellingPrice: number;
  buyingCost: number;
  lowStockThreshold: number;
  unit: string;
  hasExpiration: boolean;
  description: string;
}

export default function InventoryPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<BalanceRow | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState<'correction' | 'damage' | 'loss' | 'reconciliation'>('correction');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [historyTarget, setHistoryTarget] = useState<BalanceRow | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const [productModal, setProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<BalanceRow | null>(null);
  const [form, setForm] = useState<ProductForm>({
    name: '', category: 'feeds', sellingPrice: 0, buyingCost: 0, lowStockThreshold: 10, unit: 'pcs', hasExpiration: false, description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lowOnly) params.set('lowStock', 'true');
      const res = await api.get<{ balances: BalanceRow[] }>(`/api/inventory?${params}`);
      setBalances(res.balances);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [lowOnly, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = balances.filter((b) => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.productId.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && b.category !== category) return false;
    return true;
  });

  const categories = [...new Set(balances.map((b) => b.category))];

  const openAdjust = (row: BalanceRow) => {
    setAdjustTarget(row);
    setAdjustQty('');
    setAdjustReason('correction');
    setAdjustNotes('');
  };

  const submitAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const qty = parseInt(adjustQty);
    if (!qty) {
      toast('Enter a non-zero quantity (+ to add, − to subtract)', 'error');
      return;
    }
    setAdjusting(true);
    try {
      await api.post('/api/adjustments', {
        productId: adjustTarget.productId,
        quantity: qty,
        reason: adjustReason,
        notes: adjustNotes,
      });
      toast(`Inventory adjusted: ${adjustTarget.name} (${qty > 0 ? '+' : ''}${qty})`, 'success');
      setAdjustTarget(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Adjustment failed', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  const openHistory = async (row: BalanceRow) => {
    setHistoryTarget(row);
    setMovements([]);
    setMovementsLoading(true);
    try {
      const res = await api.get<{ movements: MovementRow[] }>(`/api/inventory/movements?productId=${row.productId}&limit=25`);
      setMovements(res.movements);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load history', 'error');
    } finally {
      setMovementsLoading(false);
    }
  };

  const openProductModal = (row: BalanceRow | null = null) => {
    setEditProduct(row);
    if (row) {
      setForm({
        name: row.name,
        category: row.category,
        sellingPrice: 0,
        buyingCost: 0,
        lowStockThreshold: row.lowStockThreshold,
        unit: row.unit,
        hasExpiration: false,
        description: '',
      });
    } else {
      setForm({ name: '', category: 'feeds', sellingPrice: 0, buyingCost: 0, lowStockThreshold: 10, unit: 'pcs', hasExpiration: false, description: '' });
    }
    setProductModal(true);
  };

  const submitProduct = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editProduct) {
        await api.put(`/api/products/${editProduct.productId}`, {
          ...form,
          sellingPrice: Number(form.sellingPrice) || undefined,
          buyingCost: Number(form.buyingCost) || undefined,
        });
        toast('Product updated', 'success');
      } else {
        await api.post('/api/products', { ...form, sellingPrice: Number(form.sellingPrice), buyingCost: Number(form.buyingCost) });
        toast('Product created', 'success');
      }
      setProductModal(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Product save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Inventory Management</h2>
            <p className="text-xs text-slate-500">Real-time stock balances with full movement audit trail</p>
          </div>
          {hasRole('owner', 'manager') && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openProductModal()}>
              New Product
            </Button>
          )}
        </div>

        <Card>
          <CardHeader
            title="Stock Balances"
            description="BR04: flagged when on-hand ≤ threshold"
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-48 rounded-lg border border-slate-300 pl-8 pr-2 text-xs"
                  />
                </div>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={categories.map((c) => ({ value: c, label: c }))}
                  placeholder="All categories"
                  className="h-8 w-36 text-xs"
                />
                <Button
                  size="sm"
                  variant={lowOnly ? 'primary' : 'outline'}
                  onClick={() => setLowOnly(!lowOnly)}
                  leftIcon={<SlidersHorizontal className="h-3 w-3" />}
                >
                  Low stock only
                </Button>
              </div>
            }
          />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader />
            ) : filtered.length === 0 ? (
              <EmptyState title="No products" message="Create a product to start tracking stock" />
            ) : (
              <Table
                columns={[
                  { key: 'name', header: 'Product', accessor: (r) => (
                    <div>
                      <span className="font-medium text-slate-900">{r.name}</span>
                      <span className="block text-[11px] text-slate-400">{r.productId}</span>
                    </div>
                  ) },
                  { key: 'category', header: 'Category', accessor: (r) => <Badge variant="neutral">{r.category}</Badge> },
                  { key: 'quantityOnHand', header: 'On Hand', accessor: (r) => (
                    <span className={`font-semibold ${r.isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                      {r.quantityOnHand} {r.unit}
                    </span>
                  ) },
                  { key: 'lowStockThreshold', header: 'Threshold', accessor: (r) => r.lowStockThreshold },
                  { key: 'status', header: 'Status', accessor: (r) => r.isLowStock ? <Badge variant="danger">Low stock</Badge> : <Badge variant="success">In stock</Badge> },
                  { key: 'lastMovementAt', header: 'Last Movement', accessor: (r) => r.lastMovementAt ? new Date(r.lastMovementAt).toLocaleDateString('en-PH') : '—' },
                  {
                    key: 'actions', header: 'Actions',
                    accessor: (r) => (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openHistory(r)} title="Movement history">
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        {hasRole('owner', 'manager') && (
                          <Button size="sm" variant="ghost" onClick={() => openAdjust(r)} title="Adjust stock">
                            <Package className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={filtered}
                keyExtractor={(r) => r.productId}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adjustment modal (BR03) */}
      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title="Adjust Inventory"
        description={adjustTarget ? `${adjustTarget.name} — currently ${adjustTarget.quantityOnHand} ${adjustTarget.unit}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdjustTarget(null)}>Cancel</Button>
            <Button onClick={submitAdjustment} loading={adjusting}>Apply adjustment</Button>
          </>
        }
      >
        <form onSubmit={submitAdjustment} className="space-y-4">
          <Input
            label="Quantity (+ adds, − subtracts)"
            type="number"
            placeholder="e.g. 5 or -2"
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
            required
          />
          <Select
            label="Reason (required by BR03)"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value as typeof adjustReason)}
            options={[
              { value: 'correction', label: 'Correction' },
              { value: 'damage', label: 'Damage' },
              { value: 'loss', label: 'Loss' },
              { value: 'reconciliation', label: 'Reconciliation' },
            ]}
          />
          <Input label="Notes" placeholder="Optional explanation" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} />
        </form>
      </Modal>

      {/* Movement history drawer */}
      <Modal
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title="Movement History"
        description={historyTarget?.name}
        size="lg"
      >
        {movementsLoading ? (
          <PageLoader />
        ) : movements.length === 0 ? (
          <EmptyState title="No movements yet" />
        ) : (
          <Table
            columns={[
              { key: 'timestamp', header: 'When', accessor: (r) => new Date(r.timestamp).toLocaleString('en-PH') },
              { key: 'type', header: 'Type', accessor: (r) => <Badge variant={r.type === 'sale' ? 'danger' : r.type === 'receiving' ? 'success' : 'info'}>{r.type}</Badge> },
              { key: 'quantity', header: 'Qty Δ', accessor: (r) => (
                <span className={`font-semibold ${r.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{r.quantity > 0 ? '+' : ''}{r.quantity}</span>
              ) },
              { key: 'reason', header: 'Reason', accessor: (r) => r.reason },
              { key: 'lotNo', header: 'Lot #', accessor: (r) => r.lotNo || '—' },
              { key: 'referenceId', header: 'Reference', accessor: (r) => <code className="text-xs text-slate-500">{r.referenceId}</code> },
              { key: 'userId', header: 'User', accessor: (r) => r.userId },
            ]}
            data={movements}
            keyExtractor={(r) => r.movementId}
          />
        )}
      </Modal>

      {/* Product create/edit */}
      <Modal
        open={productModal}
        onClose={() => setProductModal(false)}
        title={editProduct ? 'Edit Product' : 'New Product'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setProductModal(false)}>Cancel</Button>
            <Button onClick={submitProduct} loading={submitting}>{editProduct ? 'Save changes' : 'Create product'}</Button>
          </>
        }
      >
        <form onSubmit={submitProduct} className="space-y-4">
          <Input label="Product name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[
                { value: 'feeds', label: 'Feeds' },
                { value: 'medicines', label: 'Medicines' },
                { value: 'fertilizers', label: 'Fertilizers' },
                { value: 'tools', label: 'Tools' },
                { value: 'equipment', label: 'Equipment' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Selling price (₱)" type="number" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} />
            <Input label="Buying cost (₱)" type="number" min="0" value={form.buyingCost} onChange={(e) => setForm({ ...form, buyingCost: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Low stock threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: parseInt(e.target.value) || 0 })} />
            <label className="flex items-end gap-2 pb-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.hasExpiration}
                onChange={(e) => setForm({ ...form, hasExpiration: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand-700"
              />
              Product has expiration dates
            </label>
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </form>
      </Modal>
    </AppLayout>
  );
}
