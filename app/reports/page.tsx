'use client';

import { useState, type FormEvent } from 'react';
import { BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout';
import { Card, CardHeader, CardContent, Table, Badge, Button, Select, Input, PageLoader, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const ExportButton = dynamic(
  () => import('./components/ExportButton').then((mod) => mod.ExportButton),
  { loading: () => <Button variant="outline" disabled>Loading…</Button>, ssr: false }
);

type ReportType = 'sales' | 'inventory' | 'profitability' | 'supplier';

export default function ReportsPage() {
  const { hasRole } = useAuth();

  const [type, setType] = useState<ReportType>('sales');
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isProfitability = type === 'profitability';

  const fetchReport = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, format: 'json' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await api.get<{ data: Record<string, unknown>[]; total: number }>(`/api/reports?${params}`);
      setData(res.data);
      setLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const renderCell = (value: unknown) => {
    if (typeof value === 'number') {
      return Math.abs(value) > 100 && !Number.isInteger(value) ? value.toFixed(2) : value.toLocaleString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value ?? '—');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exportable sales, inventory, profitability (owner-only) and supplier performance reports
          </p>
        </div>

        <Card>
          <CardHeader
            title="Report Builder"
            description="Select a report type and date range"
            className="[&>div:first-child>h3]:text-lg [&>div:first-child>h3]:font-semibold [&>div:first-child>h3]:tracking-normal [&>div:first-child>p]:text-sm"
          />
          <CardContent className="sm:py-6">
            <form onSubmit={fetchReport} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="report-type" className="block text-sm font-medium text-neutral-700">
                  Report type
                </label>
                <Select
                  id="report-type"
                  value={type}
                  onChange={(e) => { setType(e.target.value as ReportType); setLoaded(false); }}
                  options={[
                    { value: 'sales', label: 'Sales Report' },
                    { value: 'inventory', label: 'Inventory Report' },
                    ...(hasRole('owner') ? [{ value: 'profitability', label: 'Profitability (Owner Only)' }] : []),
                    { value: 'supplier', label: 'Supplier Performance' },
                  ]}
                  className="!h-10 !rounded-lg !border-neutral-200 focus:!border-[#4d8c2f] focus:!outline-[#4d8c2f]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="start-date" className="block text-sm font-medium text-neutral-700">
                  Start date
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="!h-10 !rounded-lg !border-neutral-200 focus:!border-[#4d8c2f] focus:!outline-[#4d8c2f]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="end-date" className="block text-sm font-medium text-neutral-700">
                  End date
                </label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="!h-10 !rounded-lg !border-neutral-200 focus:!border-[#4d8c2f] focus:!outline-[#4d8c2f]"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <ExportButton
                  type={type}
                  format={format}
                  startDate={startDate}
                  endDate={endDate}
                  onFormatChange={setFormat}
                />
                <Button
                  type="submit"
                  loading={loading}
                  leftIcon={<BarChart3 className="h-4 w-4" />}
                  className="h-10 w-full !bg-[#4d8c2f] px-4 text-sm hover:!bg-[#3f7526] sm:w-auto"
                >
                  Generate
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={`${type.charAt(0).toUpperCase() + type.slice(1)} Report`}
            description={loaded ? `${data.length} rows` : 'Generate a report to preview data'}
          />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader label="Generating report..." />
            ) : !loaded || data.length === 0 ? (
              <EmptyState title="No data" message="Run the report builder above" />
            ) : (
              <Table
                columns={columns.map((key) => ({
                  key,
                  header: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                  accessor: (row: Record<string, unknown>) => {
                    const value = row[key];
                    if (key.toLowerCase().includes('stock') && String(value) === 'Yes') return <Badge variant="danger">Low stock</Badge>;
                    return renderCell(value);
                  },
                }))}
                data={data}
                keyExtractor={(row) => String(Object.values(row)[0] ?? '')}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}