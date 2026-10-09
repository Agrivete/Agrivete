'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Truck, Eye, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card, CardHeader, CardContent, Table, Badge, StatusBadge, Button, Input, Select, Modal, PageLoader, EmptyState, ConfirmModal,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface Supplier {
  supplierId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms: string;
  status: string;
  notes?: string;
}

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
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('cash_on_delivery');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(null);

  const [txTarget, setTxTarget] = useState<Supplier | null>(null);
  const [txTab, setTxTab] = useState<'purchases' | 'receivings'>('purchases');
  const [purchases, setPurchases] = useState<Replenishment[]>([]);
  const [receivings, setReceivings] = useState<ReceivingTx[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Supplier[]>('/api/suppliers');
      setSuppliers(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load suppliers', 'error');
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
    setPaymentTerms('cash_on_delivery'); setNotes('');
    setModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditTarget(s);
    setName(s.name); setContactPerson(s.contactPerson || ''); setPhone(s.phone || '');
    setEmail(s.email || ''); setAddress(s.address || '');
    setPaymentTerms(s.paymentTerms); setNotes(s.notes || '');
    setModal(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { name, contactPerson, phone, email, address, paymentTerms, notes };
      if (editTarget) {
        await api.put(`/api/suppliers/${editTarget.supplierId}`, payload);
        toast('Supplier updated', 'success');
      } else {
        await api.post('/api/suppliers', payload);
        toast('Supplier created', 'success');
      }
      setModal(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await api.delete(`/api/suppliers/${deactivateTarget.supplierId}`);
      toast('Supplier deactivated', 'success');
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to deactivate', 'error');
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
      toast(err instanceof Error ? err.message : 'Failed to load transactions', 'error');
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Supplier Management</h2>
            <p className="text-xs text-slate-500">Centralized contacts, purchase & delivery history</p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Add Supplier
          </Button>
        </div>

        <Card>
          <CardHeader title="Suppliers" description={`${suppliers.length} registered`} />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader />
            ) : suppliers.length === 0 ? (
              <EmptyState icon={<Truck className="h-7 w-7" />} title="No suppliers" message="Add your first supplier" />
            ) : (
              <Table
                columns={[
                  { key: 'name', header: 'Supplier', accessor: (r) => (
                    <div>
                      <span className="font-medium text-slate-900">{r.name}</span>
                      <span className="block text-[11px] text-slate-400">{r.contactPerson || '—'}</span>
                    </div>
                  ) },
                  { key: 'phone', header: 'Phone', accessor: (r) => r.phone || '—' },
                  { key: 'email', header: 'Email', accessor: (r) => r.email || '—' },
                  { key: 'paymentTerms', header: 'Terms', accessor: (r) => <Badge variant="neutral">{r.paymentTerms.replace(/_/g, ' ')}</Badge> },
                  { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
                  {
                    key: 'actions', header: 'Actions',
                    accessor: (r) => (
                      <div className="flex items-center gap-1">
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
                    ),
                  },
                ]}
                data={suppliers}
                keyExtractor={(r) => r.supplierId}
              />
            )}
          </CardContent>
        </Card>
      </div>

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
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </form>
      </Modal>

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
