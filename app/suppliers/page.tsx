'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Truck, Eye, Trash2, Package, CalendarOff } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card, CardHeader, CardContent, Table, Badge, StatusBadge, Button, Input, Select, Modal, PageLoader, EmptyState, ConfirmModal,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, type Column,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

interface Supplier {
  supplierId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms: string;
  availableDays?: string[];
  lastDeliveryDate?: string | null;
  status: string;
  notes?: string;
}

interface AlternativeSupplier {
  supplierId: string;
  name: string;
  contactPerson: string;
  phone: string;
}

interface SupplierFallbackData {
  category: string;
  alternatives: AlternativeSupplier[];
  loading: boolean;
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

const ALL_DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;

const DEFAULT_DAYS = ALL_DAYS.map((d) => d.key);

interface Replenishment {
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  status: string;
  items: Array<{ productName: string; orderedQuantity: number; receivedQuantity: number }>;
  total: number;
}

interface ReceivingTx {
  receivingId: string;
  supplierId: string;
  referenceNo: string;
  receivedDate: string;
  status: string;
  totalCost: number;
  items: Array<{ productName: string; receivedQuantity: number }>;
}

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const isOwner = hasRole('owner');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'all' | 'availableToday'>('all');

  const [unavailableToday, setUnavailableToday] = useState<Set<string>>(() => new Set());
  const [fallbackMap, setFallbackMap] = useState<Record<string, SupplierFallbackData>>({});

  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('cash_on_delivery');
  const [availableDays, setAvailableDays] = useState<string[]>([...DEFAULT_DAYS]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(null);

  const [txTarget, setTxTarget] = useState<Supplier | null>(null);
  const [txTab, setTxTab] = useState<'purchases' | 'receivings'>('purchases');
  const [purchases, setPurchases] = useState<Replenishment[]>([]);
  const [receivings, setReceivings] = useState<ReceivingTx[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const [invTarget, setInvTarget] = useState<{ supplierId: string; name: string } | null>(null);
  const [invProducts, setInvProducts] = useState<SupplierInventoryProduct[]>([]);
  const [invLoading, setInvLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Supplier[]>('/api/suppliers');
      setSuppliers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setName(''); setContactPerson(''); setPhone(''); setEmail(''); setAddress('');
    setPaymentTerms('cash_on_delivery'); setAvailableDays([...DEFAULT_DAYS]); setNotes('');
    setModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditTarget(s);
    setName(s.name); setContactPerson(s.contactPerson || ''); setPhone(s.phone || '');
    setEmail(s.email || ''); setAddress(s.address || '');
    setPaymentTerms(s.paymentTerms);
    setAvailableDays(s.availableDays && s.availableDays.length > 0 ? s.availableDays : [...DEFAULT_DAYS]);
    setNotes(s.notes || '');
    setModal(true);
  };

  const toggleDay = (dayKey: string) => {
    setAvailableDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { name, contactPerson, phone, email, address, paymentTerms, availableDays, notes };
      if (editTarget) {
        await api.put(`/api/suppliers/${editTarget.supplierId}`, payload);
        toast.success('Supplier updated');
      } else {
        await api.post('/api/suppliers', payload);
        toast.success('Supplier created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await api.delete(`/api/suppliers/${deactivateTarget.supplierId}`);
      toast.success('Supplier deactivated');
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  };

  const openTransactions = async (s: Supplier) => {
    setTxTarget(s);
    setTxTab('purchases');
    setTxLoading(true);
    try {
      const [reps, recs] = await Promise.all([
        api.get<{ replenishments: Replenishment[] }>('/api/replenishments?limit=100'),
        api.get<{ receivings: ReceivingTx[] }>('/api/receiving?limit=100'),
      ]);
      setPurchases(reps.replenishments.filter((r) => r.supplierId === s.supplierId));
      setReceivings(recs.receivings.filter((r) => r.supplierId === s.supplierId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  };

  const openInventory = async (s: { supplierId: string; name: string }) => {
    setInvTarget(s);
    setInvProducts([]);
    setInvLoading(true);
    try {
      const res = await api.get<SupplierInventoryResponse>(`/api/suppliers/${s.supplierId}/inventory`);
      setInvProducts(res.products || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load supplier inventory');
    } finally {
      setInvLoading(false);
    }
  };

  const toggleUnavailableToday = async (s: Supplier) => {
    const isCurrentlyUnavailable = unavailableToday.has(s.supplierId);
    const next = new Set(unavailableToday);
    if (isCurrentlyUnavailable) {
      next.delete(s.supplierId);
      setUnavailableToday(next);
      return;
    }

    next.add(s.supplierId);
    setUnavailableToday(next);

    setFallbackMap((prev) => ({
      ...prev,
      [s.supplierId]: { category: 'feeds', alternatives: [], loading: true },
    }));

    try {
      const inv = await api.get<SupplierInventoryResponse>(`/api/suppliers/${s.supplierId}/inventory`);
      const primaryCategory = inv.products?.[0]?.category || 'feeds';
      const alts = await api.get<AlternativeSupplier[]>(
        `/api/suppliers/alternatives?category=${encodeURIComponent(primaryCategory)}`
      );
      setFallbackMap((prev) => ({
        ...prev,
        [s.supplierId]: {
          category: primaryCategory,
          alternatives: alts.filter((a) => a.supplierId !== s.supplierId),
          loading: false,
        },
      }));
    } catch {
      setFallbackMap((prev) => ({
        ...prev,
        [s.supplierId]: { category: 'feeds', alternatives: [], loading: false },
      }));
    }
  };

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

  const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  const displayedSuppliers = suppliers.filter((s) => {
    if (viewFilter === 'all') return true;
    const days = s.availableDays && s.availableDays.length > 0 ? s.availableDays : DEFAULT_DAYS;
    const availableByDay = days.includes(todayKey as (typeof DEFAULT_DAYS)[number]);
    const deliveredLast24h = s.lastDeliveryDate
      ? Date.now() - new Date(s.lastDeliveryDate).getTime() <= 24 * 60 * 60 * 1000
      : false;
    return availableByDay || deliveredLast24h;
  });

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Supplier Management</h2>
              <p className="text-xs text-slate-500">Centralized contacts, purchase & delivery history</p>
            </div>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Add Supplier
            </Button>
          </div>

          <Card>
            <CardHeader
              title="Suppliers"
              description={`${displayedSuppliers.length} shown of ${suppliers.length} registered`}
              action={
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setViewFilter('all')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      viewFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    All suppliers
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewFilter('availableToday')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      viewFilter === 'availableToday' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Available today
                  </button>
                </div>
              }
            />
            <CardContent className="p-0">
              {loading ? (
                <PageLoader />
              ) : displayedSuppliers.length === 0 ? (
                <EmptyState
                  icon={<Truck className="h-7 w-7" />}
                  title={viewFilter === 'availableToday' ? 'No suppliers available today' : 'No suppliers'}
                  message={viewFilter === 'availableToday' ? 'No suppliers match today’s schedule or 24h delivery window' : 'Add your first supplier'}
                />
              ) : (
                <>
                  <Table
                    columns={[
                      {
                        key: 'name',
                        header: 'Supplier',
                        accessor: (r) => {
                          const isUnavail = unavailableToday.has(r.supplierId);
                          return (
                            <div className={isUnavail ? 'opacity-50' : ''}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-900">{r.name}</span>
                                {isUnavail && <Badge variant="warning">Unavailable today</Badge>}
                              </div>
                              <span className="block text-[11px] text-slate-400">{r.contactPerson || '—'}</span>
                            </div>
                          );
                        },
                      },
                      {
                        key: 'phone',
                        header: 'Phone',
                        accessor: (r) => (
                          <span className={unavailableToday.has(r.supplierId) ? 'opacity-50' : ''}>
                            {r.phone || '—'}
                          </span>
                        ),
                      },
                      {
                        key: 'email',
                        header: 'Email',
                        accessor: (r) => (
                          <span className={unavailableToday.has(r.supplierId) ? 'opacity-50' : ''}>
                            {r.email || '—'}
                          </span>
                        ),
                      },
                      {
                        key: 'paymentTerms',
                        header: 'Terms',
                        accessor: (r) => (
                          <div className={unavailableToday.has(r.supplierId) ? 'opacity-50' : ''}>
                            <Badge variant="neutral">{r.paymentTerms.replace(/_/g, ' ')}</Badge>
                          </div>
                        ),
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        accessor: (r) => (
                          <div className={unavailableToday.has(r.supplierId) ? 'opacity-50' : ''}>
                            <StatusBadge status={r.status} />
                          </div>
                        ),
                      },
                      {
                        key: 'actions',
                        header: 'Actions',
                        accessor: (r) => {
                          const isUnavail = unavailableToday.has(r.supplierId);
                          return (
                            <div className="flex flex-wrap items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant={isUnavail ? 'secondary' : 'ghost'}
                                    onClick={() => toggleUnavailableToday(r)}
                                    aria-label="Mark unavailable today"
                                  >
                                    <CalendarOff className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark unavailable today</TooltipContent>
                              </Tooltip>
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Package className="h-3.5 w-3.5" />}
                                onClick={() => openInventory(r)}
                                title="View inventory"
                              >
                                View inventory
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openTransactions(r)} title="View transactions">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Edit">
                                <span className="text-xs font-semibold text-slate-500">Edit</span>
                              </Button>
                              {r.status === 'active' && (
                                <Button size="sm" variant="ghost" onClick={() => setDeactivateTarget(r)} title="Deactivate">
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              )}
                            </div>
                          );
                        },
                      },
                    ]}
                    data={displayedSuppliers}
                    keyExtractor={(r) => r.supplierId}
                  />

                  {/* Fallback panels for suppliers marked unavailable today */}
                  {displayedSuppliers
                    .filter((s) => unavailableToday.has(s.supplierId))
                    .map((s) => {
                      const fb = fallbackMap[s.supplierId];
                      const visibleAlternatives = (fb?.alternatives || []).filter(
                        (alt) => !unavailableToday.has(alt.supplierId)
                      );
                      return (
                        <div
                          key={`fallback-${s.supplierId}`}
                          className="border-t border-amber-200 bg-amber-50/70 px-4 py-3 sm:px-6"
                        >
                          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="text-xs font-semibold text-amber-900">
                              Alternative suppliers for {fb?.category || 'feeds'} (backup for {s.name})
                            </h4>
                          </div>
                          {fb?.loading ? (
                            <p className="text-xs text-slate-500">Loading alternative suppliers...</p>
                          ) : visibleAlternatives.length === 0 ? (
                            <p className="text-xs text-slate-600">
                              No other suppliers available for this category today
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              {visibleAlternatives.map((alt) => (
                                <div
                                  key={alt.supplierId}
                                  className="flex flex-col justify-between gap-2 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-4"
                                >
                                  <div>
                                    <p className="text-xs font-semibold text-slate-900">{alt.name}</p>
                                    <p className="text-[11px] text-slate-500">
                                      {alt.contactPerson || 'No contact'} • {alt.phone || 'No phone'}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    leftIcon={<Package className="h-3.5 w-3.5" />}
                                    onClick={() => openInventory({ supplierId: alt.supplierId, name: alt.name })}
                                  >
                                    View inventory
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editTarget ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={submit} loading={submitting}>{editTarget ? 'Save changes' : 'Add supplier'}</Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Input label="Supplier name" required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Select
              label="Payment terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              options={[
                { value: 'cash_on_delivery', label: 'Cash on Delivery' },
                { value: 'net_15', label: 'Net 15' },
                { value: 'net_30', label: 'Net 30' },
                { value: 'net_60', label: 'Net 60' },
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Available delivery days</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const active = availableDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </form>
      </Modal>

      {/* Supplier Inventory Dialog */}
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

      {/* Transaction history */}
      <Modal
        open={!!txTarget}
        onClose={() => setTxTarget(null)}
        title="Supplier Transactions"
        description={txTarget?.name}
        size="lg"
      >
        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['purchases', 'receivings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTxTab(tab)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                txTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {txLoading ? (
          <PageLoader />
        ) : txTab === 'purchases' ? (
          <Table
            columns={[
              { key: 'purchaseId', header: 'PO #', accessor: (r) => <code className="text-xs text-slate-500">{r.purchaseId}</code> },
              { key: 'orderDate', header: 'Ordered', accessor: (r) => new Date(r.orderDate).toLocaleDateString('en-PH') },
              { key: 'expectedDate', header: 'Expected', accessor: (r) => r.expectedDate ? new Date(r.expectedDate).toLocaleDateString('en-PH') : '—' },
              { key: 'items', header: 'Items', accessor: (r) => r.items.reduce((s, i) => s + i.orderedQuantity, 0) },
              { key: 'total', header: 'Total', accessor: (r) => `₱${r.total.toFixed(2)}` },
              { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
            ]}
            data={purchases}
            keyExtractor={(r) => r.purchaseId}
            emptyMessage="No purchase orders for this supplier"
          />
        ) : (
          <Table
            columns={[
              { key: 'receivingId', header: 'Receipt', accessor: (r) => <code className="text-xs text-slate-500">{r.receivingId}</code> },
              { key: 'referenceNo', header: 'Reference #', accessor: (r) => r.referenceNo },
              { key: 'receivedDate', header: 'Received', accessor: (r) => new Date(r.receivedDate).toLocaleDateString('en-PH') },
              { key: 'items', header: 'Items', accessor: (r) => r.items.reduce((s, i) => s + i.receivedQuantity, 0) },
              { key: 'totalCost', header: 'Total Cost', accessor: (r) => `₱${r.totalCost.toFixed(2)}` },
              { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
            ]}
            data={receivings}
            keyExtractor={(r) => r.receivingId}
            emptyMessage="No receipts from this supplier"
          />
        )}
      </Modal>

      <ConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={deactivate}
        title="Deactivate supplier"
        message={`Deactivate ${deactivateTarget?.name}? They will no longer appear in active lists.`}
        confirmLabel="Deactivate"
      />
    </AppLayout>
  );
}
