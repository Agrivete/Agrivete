'use client';

import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Plus, ShoppingCart, Search, Ban, Receipt, Printer, X, Check } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card, CardHeader, CardContent, Table, Badge, StatusBadge, Button, Input, Select, Modal, Pagination, EmptyState, PageLoader, ConfirmModal,
} from '@/components/ui';
import { ReceiptModal, type ReceiptData } from '@/components/sales/ReceiptModal';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { enqueue } from '@/lib/offlineQueue';
import { toast } from 'sonner';

interface SaleRow {
  saleId: string;
  receiptNumber?: string;
  date: string;
  customerName: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number; lotNo?: string }>;
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
  const { user, hasRole } = useAuth();

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Sale Modal state
  const [saleModal, setSaleModal] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<SaleFormItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  // Quick item search / scan within Sale Modal
  const [quickSearch, setQuickSearch] = useState('');

  // Receipt Modal state
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Cancel target state
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
      toast.error(err instanceof Error ? err.message : 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

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
      setQuickSearch('');
      setSaleModal(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load products');
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

  // Quick-add product from search bar / barcode scan
  const quickAddProduct = (prod: ProductOption) => {
    const existingIndex = items.findIndex((it) => it.productId === prod.productId);
    if (existingIndex >= 0) {
      const currentQty = items[existingIndex].quantity;
      if (currentQty >= prod.quantityOnHand) {
        toast.error(`Cannot exceed available stock (${prod.quantityOnHand} ${prod.unit})`, { id: 'stock-limit' });
        return;
      }
      updateItem(existingIndex, { quantity: Math.min(1000, currentQty + 1) });
      toast.success(`Incremented ${prod.name} (Qty: ${currentQty + 1})`, { id: 'quick-add' });
    } else {
      setItems([
        ...items,
        {
          productId: prod.productId,
          productName: prod.name,
          quantity: 1,
          unitPrice: prod.sellingPrice,
        },
      ]);
      toast.success(`Added ${prod.name}`, { id: 'quick-add' });
    }
    setQuickSearch('');
  };

  const handleQuickSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const matches = matchingQuickProducts;
      if (matches.length > 0) {
        quickAddProduct(matches[0]);
      }
    }
  };

  const matchingQuickProducts = quickSearch.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
            p.productId.toLowerCase().includes(quickSearch.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const formatCurrency = (val: number) => {
    if (isNaN(val) || !isFinite(val)) return '₱0.00';
    return val.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
  };

  const subtotal = items.reduce((s, it) => s + (it.quantity || 0) * (it.unitPrice || 0), 0);
  const totalAmount = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const submitSale = async (e: FormEvent) => {
    e.preventDefault();
    if (!items.length || items.some((it) => !it.productId || it.quantity < 1)) {
      toast.error('Add at least one valid item');
      return;
    }
    setSubmitting(true);

    const salePayload = {
      items: items.map((it) => ({
        productId: it.productId,
        quantity: Math.min(1000, Math.max(1, it.quantity)),
        unitPrice: Math.min(100000, Math.max(0, it.unitPrice)),
      })),
      paymentMethod,
      customerName: customerName.trim().slice(0, 50),
      discount: Math.min(1000000, Math.max(0, parseFloat(discount) || 0)),
    };

    // If browser is offline, enqueue directly into IndexedDB (BR08)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      try {
        const queued = await enqueue('sale', salePayload);
        toast.info('Sale saved to offline queue (BR08)', {
          id: 'pos-toast',
          description: 'Network offline. Transaction stored locally and will sync automatically once reconnected.',
        });
        setSaleModal(false);
        setActiveReceipt({
          saleId: queued.localId,
          receiptNumber: queued.localId,
          date: new Date().toISOString(),
          customerName: customerName.trim() || 'Walk-in',
          paymentMethod,
          items: items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.quantity * it.unitPrice,
          })),
          subtotal,
          discount: parseFloat(discount) || 0,
          total: totalAmount,
          status: 'pending',
          cashierName: user?.name,
          businessName: user?.businessName || 'Agrivet Store',
        });
        setItems([]);
        setCustomerName('');
        setDiscount('');
        return;
      } catch (err) {
        toast.error('Failed to save offline sale to local queue');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    try {
      const recorded = await api.post<SaleRow>('/api/sales', salePayload);

      toast.success('Sale recorded — inventory deducted (BR01)');
      setSaleModal(false);
      load();

      // Automatically present receipt modal for printing or viewing
      setActiveReceipt({
        saleId: recorded.saleId,
        receiptNumber: recorded.receiptNumber || recorded.saleId,
        date: recorded.date || new Date().toISOString(),
        customerName: customerName.trim() || 'Walk-in',
        paymentMethod,
        items: items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.quantity * it.unitPrice,
        })),
        subtotal,
        discount: parseFloat(discount) || 0,
        total: totalAmount,
        status: 'completed',
        cashierName: user?.name,
        businessName: user?.businessName || 'Agrivet Store',
      });
      setItems([]);
      setCustomerName('');
      setDiscount('');
    } catch (err) {
      // If network dropped mid-request, fallback gracefully to offline queue (BR08)
      const isNetworkError =
        (typeof navigator !== 'undefined' && navigator.onLine === false) ||
        (err instanceof Error && /failed to fetch|network|load failed/i.test(err.message));

      if (isNetworkError) {
        try {
          const queued = await enqueue('sale', salePayload);
          toast.info('Sale saved to offline queue (BR08)', {
            id: 'pos-toast',
            description: 'Network dropped during checkout. Saved locally and queued for background sync.',
          });
          setSaleModal(false);
          setActiveReceipt({
            saleId: queued.localId,
            receiptNumber: queued.localId,
            date: new Date().toISOString(),
            customerName: customerName.trim() || 'Walk-in',
            paymentMethod,
            items: items.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.quantity * it.unitPrice,
            })),
            subtotal,
            discount: parseFloat(discount) || 0,
            total: totalAmount,
            status: 'pending',
            cashierName: user?.name,
            businessName: user?.businessName || 'Agrivet Store',
          });
          setItems([]);
          setCustomerName('');
          setDiscount('');
          return;
        } catch {
          /* continue to error toast */
        }
      }
      toast.error(err instanceof Error ? err.message : 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/api/sales/${cancelTarget.saleId}`, { action: 'cancel' });
      toast.success('Sale cancelled — inventory restored');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel sale');
    } finally {
      setCancelling(false);
    }
  };

  // Filter sales list locally if search query is provided
  const displayedSales = searchTerm.trim()
    ? sales.filter(
        (s) =>
          s.saleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.receiptNumber && s.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : sales;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sales &amp; POS Checkout</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{total} total transactions</p>
          </div>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openSaleModal}
            className="bg-brand-700 hover:bg-brand-800 text-white"
          >
            New Sale
          </Button>
        </div>

        <Card className="min-h-0">
          <CardHeader
            title="Transactions"
            description="Completed sales auto-deduct stock atomically (BR01)"
            className="sm:[&>div:last-child]:shrink-0"
            action={
              <div className="flex w-full flex-col gap-2 sm:w-max sm:flex-row sm:items-center sm:gap-2">
                <div className="relative w-full sm:w-64 sm:shrink-0">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by ID or customer..."
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="w-full sm:w-44 sm:shrink-0">
                  <Select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    options={[
                      { value: 'completed', label: 'Completed' },
                      { value: 'cancelled', label: 'Cancelled' },
                      { value: 'refunded', label: 'Refunded' },
                    ]}
                    placeholder="All statuses"
                    className="h-10 w-full text-xs"
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
                  {
                    key: 'saleId',
                    header: 'Sale ID',
                    accessor: (r) => (
                      <div className="flex flex-col">
                        <code className="text-xs font-semibold text-slate-900 dark:text-slate-100">{r.saleId}</code>
                        {r.receiptNumber && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{r.receiptNumber}</span>
                        )}
                      </div>
                    ),
                  },
                  { key: 'customerName', header: 'Customer', accessor: (r) => r.customerName || 'Walk-in' },
                  {
                    key: 'items',
                    header: 'Items',
                    accessor: (r) => (
                      <span className="inline-flex items-center gap-1 font-medium">
                        {r.items.reduce((s, i) => s + i.quantity, 0)}{' '}
                        <span className="text-xs text-slate-400 font-normal">({r.items.length} lines)</span>
                      </span>
                    ),
                  },
                  {
                    key: 'date',
                    header: 'Date',
                    accessor: (r) => (
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {new Date(r.date).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ),
                  },
                  ...(hasRole('owner')
                    ? [{ key: 'subtotal', header: 'Subtotal', accessor: (r: SaleRow) => formatCurrency(r.subtotal) }]
                    : []),
                  {
                    key: 'total',
                    header: 'Total',
                    accessor: (r) => <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(r.total)}</span>,
                  },
                  { key: 'paymentMethod', header: 'Payment', accessor: (r) => <StatusBadge status={r.paymentMethod} /> },
                  { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
                  {
                    key: 'actions',
                    header: 'Actions',
                    accessor: (r) => (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View &amp; Print Receipt"
                          aria-label={`Print receipt for sale ${r.saleId}`}
                          onClick={() =>
                            setActiveReceipt({
                              saleId: r.saleId,
                              receiptNumber: r.receiptNumber || r.saleId,
                              date: r.date,
                              customerName: r.customerName || 'Walk-in',
                              paymentMethod: r.paymentMethod,
                              items: r.items.map((it) => ({
                                productId: it.productId,
                                productName: it.productName,
                                quantity: it.quantity,
                                unitPrice: it.unitPrice,
                                subtotal: it.subtotal,
                                lotNo: it.lotNo,
                              })),
                              subtotal: r.subtotal ?? r.total,
                              discount: r.discount ?? 0,
                              total: r.total,
                              status: r.status,
                              cashierName: user?.name,
                              businessName: user?.businessName || 'Agrivet Store',
                            })
                          }
                          className="h-8 w-8 p-0 text-brand-700 hover:bg-brand-50 hover:text-brand-800 dark:text-brand-400 dark:hover:bg-brand-950/50"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        {r.status === 'completed' && hasRole('owner', 'manager') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Cancel Sale"
                            aria-label={`Cancel sale ${r.saleId}`}
                            onClick={() => setCancelTarget(r)}
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={displayedSales}
                keyExtractor={(r) => r.saleId}
                emptyMessage="No transactions found"
              />
            )}
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </CardContent>
        </Card>
      </div>

      {/* Record Sale / POS Counter Modal */}
      <Modal
        open={saleModal}
        onClose={() => setSaleModal(false)}
        title="Record Counter Sale"
        description="POS sale atomically decrements on-hand inventory balances (BR01)"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaleModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitSale}
              loading={submitting}
              leftIcon={<ShoppingCart className="h-4 w-4" />}
              className="bg-brand-700 hover:bg-brand-800 text-white"
            >
              Complete Sale — {formatCurrency(totalAmount)}
            </Button>
          </>
        }
      >
        <form onSubmit={submitSale} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Customer name"
              placeholder="Walk-in customer"
              maxLength={50}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value.slice(0, 50))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card' },
                  { value: 'gcash', label: 'GCash' },
                  { value: 'credit', label: 'Store Credit' },
                ]}
              />
              <Input
                label="Discount (₱)"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                value={discount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (isNaN(val)) setDiscount('');
                  else setDiscount(String(Math.min(1000000, Math.max(0, val))));
                }}
              />
            </div>
          </div>

          {/* Quick-Add Product Search Bar */}
          <div className="relative rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-900/50 dark:bg-brand-950/20">
            <label className="mb-1 block text-xs font-semibold text-brand-900 dark:text-brand-300">
              Quick Item Lookup &amp; Fast Add
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-600 dark:text-brand-400" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onKeyDown={handleQuickSearchKeyDown}
                placeholder="Type product name, category, or scan barcode... (Press Enter to add)"
                className="h-10 w-full rounded-lg border border-brand-300 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 dark:border-brand-800 dark:bg-slate-900 dark:text-slate-100"
              />
              {quickSearch && (
                <button
                  type="button"
                  onClick={() => setQuickSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {matchingQuickProducts.length > 0 && (
              <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Select item to add to cart:
                </div>
                {matchingQuickProducts.map((prod) => (
                  <button
                    key={prod.productId}
                    type="button"
                    onClick={() => quickAddProduct(prod)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-brand-50 dark:hover:bg-brand-950/50"
                  >
                    <div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{prod.name}</span>
                      <span className="ml-2 text-[10px] text-slate-500 dark:text-slate-400">
                        ({prod.quantityOnHand} {prod.unit} in stock)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-700 dark:text-brand-400">
                        {formatCurrency(prod.sellingPrice)}
                      </span>
                      <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                        + Add
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Items in Cart ({items.length})
              </span>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={addItem}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add Row
              </Button>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
              {items.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Cart is empty — scan/type in the lookup box above or click &ldquo;Add Row&rdquo;
                  </p>
                </div>
              )}
              {items.map((item, index) => (
                <div key={index} className="space-y-2 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800 sm:grid sm:grid-cols-12 sm:items-end sm:gap-2 sm:space-y-0 sm:pb-2.5">
                  <div className="w-full sm:col-span-5">
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
                  <div className="flex items-center gap-2 sm:contents">
                    <div className="w-20 sm:col-span-2">
                      <Input
                        label="Qty"
                        type="number"
                        min="1"
                        max="1000"
                        value={item.quantity}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value);
                          const val = isNaN(parsed) ? 1 : Math.min(1000, Math.max(1, parsed));
                          updateItem(index, { quantity: val });
                        }}
                      />
                    </div>
                    <div className="w-24 sm:col-span-2">
                      <Input
                        label="Price (₱)"
                        type="number"
                        min="0"
                        max="100000"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value);
                          const val = isNaN(parsed) ? 0 : Math.min(100000, Math.max(0, parsed));
                          updateItem(index, { unitPrice: val });
                        }}
                      />
                    </div>
                    <div className="flex-1 pb-1 text-right sm:col-span-2 sm:pb-1.5 sm:text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span className="text-[10px] text-slate-400 block sm:hidden">Subtotal</span>
                      {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                    </div>
                    <div className="pb-1 text-right sm:col-span-1 sm:pb-1.5">
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        className="rounded-md px-1.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/40">
              <span className="text-xs text-slate-500 dark:text-slate-400">Subtotal</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* POS Receipt Preview & Print Modal */}
      <ReceiptModal
        open={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        receipt={activeReceipt}
      />

      {/* Cancel Transaction Modal */}
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
