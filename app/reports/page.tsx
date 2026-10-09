'use client';

import { useState, type FormEvent } from 'react';
import { Download, BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout';
import { Card, CardHeader, CardContent, Table, Badge, Button, Select, Input, PageLoader, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';

const ExportButton = dynamic(
  () => import('./components/ExportButton').then((mod) => mod.ExportButton),
  { loading: () => <Button variant="outline" disabled>Loading…</Button>, ssr: false }
);

type ReportType = 'sales' | 'inventory' | 'profitability' | 'supplier';

export default function ReportsPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();

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
      toast(err instanceof Error ? err.message : 'Failed to generate report', 'error');
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
          <h2 className="text-lg font-semibold text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500">
            Exportable sales, inventory, profitability (owner-only) and supplier performance reports
          </p>
        </div>

        <Card>
          <CardHeader title="Report Builder" description="Select a report type and date range" />
          <CardContent>
            <form onSubmit={fetchReport} className="flex flex-wrap items-end gap-3">
              <Select
                label="Report type"
                value={type}
                onChange={(e) => { setType(e.target.value as ReportType); setLoaded(false); }}
                options={[
                  { value: 'sales', label: 'Sales Report' },
                  { value: 'inventory', label: 'Inventory Report' },
                  ...(hasRole('owner') ? [{ value: 'profitability', label: 'Profitability (Owner Only)' }] : []),
                  { value: 'supplier', label: 'Supplier Performance' },
                ]}
                className="w-52"
              />
              <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
              <ExportButton
                type={type}
                format={format}
                startDate={startDate}
                endDate={endDate}
                onFormatChange={setFormat}
              />
              <Button type="submit" loading={loading} leftIcon={<BarChart3 className="h-4 w-4" />}>
                Generate
              </Button>
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