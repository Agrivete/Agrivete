'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardHeader, CardContent, Table, Badge, PageLoader, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ExpiringLot {
  productId: string;
  productName: string;
  category?: string;
  lotNo: string;
  expirationDate: string;
  daysUntilExpiry: number;
  quantity: number;
}

export default function ExpirationPage() {
  const [lots, setLots] = useState<ExpiringLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ expiring: ExpiringLot[] }>(`/api/alerts?type=expiring&days=${days}`);
      setLots(res.expiring);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load expiration data');
    } finally {
      setLoading(false);
    }
  }, [days, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const urgency = (d: number): 'danger' | 'warning' | 'info' =>
    d <= 7 ? 'danger' : d <= 14 ? 'warning' : 'info';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Expiration Monitoring</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              BR05: stock flagged within a {days}-day window · sorted First-Expiry-First-Out
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 self-start sm:self-auto">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  days === d
                    ? 'bg-brand-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader
            title="Expiring Lots"
            description={`${lots.length} lot${lots.length === 1 ? '' : 's'} expiring within ${days} days`}
            action={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader />
            ) : lots.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-7 w-7" />}
                title="Nothing expiring"
                message={`No lots expire within the next ${days} days`}
              />
            ) : (
              <Table
                columns={[
                  { key: 'productName', header: 'Product', accessor: (r) => (
                    <div>
                      <span className="font-medium text-slate-900">{r.productName}</span>
                      <span className="block text-[11px] text-slate-400">{r.productId}</span>
                    </div>
                  ) },
                  { key: 'lotNo', header: 'Lot / Batch #', accessor: (r) => <code className="text-xs text-slate-500">{r.lotNo}</code> },
                  { key: 'quantity', header: 'Qty on Hand', accessor: (r) => <span className="font-semibold">{r.quantity}</span> },
                  { key: 'expirationDate', header: 'Expiration Date', accessor: (r) => new Date(r.expirationDate).toLocaleDateString('en-PH') },
                  { key: 'daysUntilExpiry', header: 'Days Left', accessor: (r) => <Badge variant={urgency(r.daysUntilExpiry)}>{r.daysUntilExpiry} days</Badge> },
                  { key: 'action', header: 'FEFO Priority', accessor: (r) => (
                    <span className="text-[11px] font-medium text-slate-500">
                      {r.daysUntilExpiry <= 7 ? 'Sell first — critical' : r.daysUntilExpiry <= 14 ? 'Prioritize' : 'Monitor'}
                    </span>
                  ) },
                ]}
                data={lots}
                keyExtractor={(r) => `${r.productId}-${r.lotNo}`}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
