'use client';

import { useEffect, useRef } from 'react';
import { Printer, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui';

export interface ReceiptSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  lotNo?: string;
}

export interface ReceiptData {
  saleId: string;
  receiptNumber?: string;
  date: string;
  customerName?: string;
  paymentMethod: string;
  items: ReceiptSaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  cashierName?: string;
  businessName?: string;
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export function ReceiptModal({ open, onClose, receipt }: ReceiptModalProps) {
  const printButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    if (isNaN(val) || !isFinite(val)) return '₱0.00';
    return val.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
  };

  const formattedDate = new Date(receipt.date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalQuantity = receipt.items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const storeName = receipt.businessName || 'Agrivet Retail & Supply';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
        className="relative z-10 flex w-full max-w-md flex-col max-h-[92vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h3 id="receipt-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Receipt Preview
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-slate-950/40">
          {/* Printable Receipt Paper Container */}
          <div
            id="pos-receipt-print-area"
            className="mx-auto w-full max-w-[340px] rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-sm font-mono text-xs dark:border-slate-700 dark:bg-white dark:text-black"
          >
            {/* Store Branding */}
            <div className="text-center pb-2.5 border-b border-dashed border-slate-300 receipt-divider">
              <h2 className="text-base font-bold tracking-tight uppercase">{storeName}</h2>
              <p className="text-[10px] text-slate-600 dark:text-slate-700 mt-0.5">
                Agricultural &amp; Veterinary Supplies
              </p>
              <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-600 uppercase tracking-wider mt-1">
                OFFICIAL SALES INVOICE
              </p>
            </div>

            {/* Metadata (Receipt No, Date, Cashier, Customer) */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px] receipt-divider">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-700">Receipt No:</span>
                <span className="font-semibold">{receipt.receiptNumber || receipt.saleId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-700">Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-700">Cashier:</span>
                <span className="truncate max-w-[170px]">{receipt.cashierName || 'Staff Clerk'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-700">Customer:</span>
                <span className="truncate max-w-[170px]">{receipt.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-700">Payment:</span>
                <span className="uppercase font-semibold">{receipt.paymentMethod}</span>
              </div>
            </div>

            {/* Items Header */}
            <div className="pt-2 pb-1 border-b border-dashed border-slate-300 font-semibold text-[10px] uppercase text-slate-600 dark:text-slate-700 flex justify-between receipt-divider">
              <span>Item Description</span>
              <span>Total</span>
            </div>

            {/* Line Items List */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-2 receipt-divider">
              {receipt.items.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-[11px] leading-tight break-words">{it.productName}</span>
                    <span className="font-semibold text-[11px] shrink-0">{formatCurrency(it.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-700">
                    <span>
                      {it.quantity} @ {formatCurrency(it.unitPrice)}
                    </span>
                    {it.lotNo && <span className="text-[9px] uppercase">Lot: {it.lotNo}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 receipt-divider">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-700">Items Sold:</span>
                <span>{totalQuantity}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-700">Subtotal:</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-[11px] text-red-600 dark:text-red-700 font-medium">
                  <span>Discount:</span>
                  <span>-{formatCurrency(receipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatCurrency(receipt.total)}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center pt-3 text-[10px] text-slate-600 dark:text-slate-700 space-y-1">
              <p className="font-semibold">Thank you for your purchase!</p>
              <p className="text-[9px]">Please keep this receipt for warranty and return claims.</p>
              <p className="text-[8px] text-slate-400 dark:text-slate-500 pt-1">
                Agrivet POS v1.0 • FEFO Verified
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
          <Button
            ref={printButtonRef}
            variant="default"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
            className="bg-brand-700 hover:bg-brand-800 text-white"
          >
            Print Receipt (Ctrl+P)
          </Button>
        </div>
      </div>
    </div>
  );
}

