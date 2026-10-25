'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileText,
  Filter,
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  Badge,
  Button,
  Select,
  Input,
  PageLoader,
  EmptyState,
} from '@/components/ui';
import { ExportButton } from './components/ExportButton';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

type ReportType = 'sales' | 'inventory' | 'profitability' | 'supplier';

const peso = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReportsPage() {
  const { hasRole } = useAuth();

  const [type, setType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchReport = useCallback(
    async (selectedType: ReportType = type, start = startDate, end = endDate) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ type: selectedType, format: 'json' });
        if (start) params.set('startDate', start);
        if (end) params.set('endDate', end);
        const res = await api.get<{ data: Record<string, unknown>[]; total: number }>(
          `/api/reports?${params}`
        );
        setData(res.data);
        setLoaded(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to generate report');
      } finally {
        setLoading(false);
      }
    },
    [type, startDate, endDate]
  );

  // Auto-generate default Sales report on initial load
  useEffect(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);
    setStartDate(firstOfMonth);
    setEndDate(todayStr);
    fetchReport('sales', firstOfMonth, todayStr);
  }, []);

  const handleTypeChange = (newType: ReportType) => {
    setType(newType);
    fetchReport(newType, startDate, endDate);
  };

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let start = '';
    let end = todayStr;

    if (preset === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().slice(0, 10);
    } else if (preset === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      start = d.toISOString().slice(0, 10);
    } else if (preset === 'year') {
      const d = new Date(now.getFullYear(), 0, 1);
      start = d.toISOString().slice(0, 10);
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);
    fetchReport(type, start, end);
  };

  // Executive KPI Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (!data || data.length === 0) return null;

    if (type === 'sales') {
      const totalRevenue = data.reduce((acc, row) => acc + (Number(row.total) || 0), 0);
      const totalProfit = hasRole('owner')
        ? data.reduce((acc, row) => acc + (Number(row.profit) || 0), 0)
        : null;
      const avgOrder = totalRevenue / data.length;
      return [
        {
          label: 'Total Revenue',
          value: peso(totalRevenue),
          detail: `${data.length} transactions`,
          icon: DollarSign,
          color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
        },
        {
          label: 'Average Order Value',
          value: peso(avgOrder),
          detail: 'Per transaction checkout',
          icon: TrendingUp,
          color: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60',
        },
        totalProfit !== null
          ? {
              label: 'Total Gross Profit',
              value: peso(totalProfit),
              detail: `Margin ${((totalProfit / totalRevenue) * 100 || 0).toFixed(1)}%`,
              icon: TrendingUp,
              color: 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-950/60',
            }
          : {
              label: 'Total Completed',
              value: String(data.length),
              detail: 'Audited sales orders',
              icon: BarChart3,
              color: 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/60',
            },
      ];
    }

    if (type === 'inventory') {
      const lowStockCount = data.filter((row) => row.low_stock === 'Yes').length;
      const totalStockVal = hasRole('owner')
        ? data.reduce((acc, row) => acc + (Number(row.stock_value) || 0), 0)
        : null;
      return [
        {
          label: 'Catalog Products',
          value: String(data.length),
          detail: 'Active catalog SKUs',
          icon: Package,
          color: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60',
        },
        {
          label: 'Low Stock Flagged',
          value: String(lowStockCount),
          detail: 'At or below threshold (BR04)',
          icon: Filter,
          color: lowStockCount > 0
            ? 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60'
            : 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
        },
        totalStockVal !== null
          ? {
              label: 'Total Inventory Value',
              value: peso(totalStockVal),
              detail: 'Commercial inventory cost',
              icon: DollarSign,
              color: 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-950/60',
            }
          : {
              label: 'Sufficient Stock',
              value: String(data.length - lowStockCount),
              detail: 'Healthy on-hand balances',
              icon: Package,
              color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
            },
      ];
    }

    if (type === 'profitability') {
      const totalRevenue = data.reduce((acc, row) => acc + (Number(row.revenue) || 0), 0);
      const totalProfit = data.reduce((acc, row) => acc + (Number(row.profit) || 0), 0);
      const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      return [
        {
          label: 'Total Product Revenue',
          value: peso(totalRevenue),
          detail: 'Gross sales turnover',
          icon: DollarSign,
          color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
        },
        {
          label: 'Total Gross Profit',
          value: peso(totalProfit),
          detail: 'Revenue minus COGS',
          icon: TrendingUp,
          color: 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-950/60',
        },
        {
          label: 'Overall Profit Margin',
          value: `${overallMargin.toFixed(1)}%`,
          detail: 'Volume-weighted margin',
          icon: TrendingUp,
          color: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60',
        },
      ];
    }

    if (type === 'supplier') {
      const totalDeliveries = data.reduce((acc, row) => acc + (Number(row.deliveries) || 0), 0);
      const totalSpend = data.reduce((acc, row) => acc + (Number(row.total_cost) || 0), 0);
      return [
        {
          label: 'Active Suppliers',
          value: String(data.length),
          detail: 'Registered vendor partners',
          icon: Truck,
          color: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60',
        },
        {
          label: 'Total Deliveries',
          value: String(totalDeliveries),
          detail: 'Confirmed receiving batches',
          icon: Package,
          color: 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/60',
        },
        {
          label: 'Procurement Spend',
          value: peso(totalSpend),
          detail: 'Historical stock intake cost',
          icon: DollarSign,
          color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
        },
      ];
    }

    return null;
  }, [data, type, hasRole]);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const renderCell = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';

    const k = key.toLowerCase();

    // Currency values
    if (
      typeof value === 'number' &&
      (k.includes('total') ||
        k.includes('cost') ||
        k.includes('profit') ||
        k.includes('revenue') ||
        k.includes('subtotal') ||
        k.includes('price') ||
        k.includes('discount') ||
        k.includes('value'))
    ) {
      return (
        <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {peso(value)}
        </span>
      );
    }

    // Percentage values
    if (
      typeof value === 'number' &&
      (k.includes('pct') || k.includes('margin') || k.includes('percent'))
    ) {
      return (
        <span className="font-semibold tabular-nums text-brand-700 dark:text-brand-400">
          {value.toFixed(1)}%
        </span>
      );
    }

    // Low stock badge
    if (k.includes('low_stock') || k.includes('stock')) {
      if (String(value) === 'Yes') return <Badge variant="danger">Low stock</Badge>;
      if (String(value) === 'No') return <Badge variant="success">Normal</Badge>;
    }

    // Status badge
    if (k === 'status') {
      return (
        <Badge variant={String(value) === 'completed' ? 'success' : 'neutral'}>
          {String(value)}
        </Badge>
      );
    }

    // Plain numbers
    if (typeof value === 'number') {
      return <span className="tabular-nums font-medium">{value.toLocaleString('en-PH')}</span>;
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Reports &amp; Analytics
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              CSV spreadsheet export and financial analytics for retail agricultural operations
            </p>
          </div>
        </div>

        {/* Report Filter & Export Controls Card */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Report Builder &amp; CSV Export"
            description="Select report domain, specify dates, and export directly to CSV or PDF"
          />
          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Form Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Report Type */}
              <div className="space-y-1.5">
                <label
                  htmlFor="report-type"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Report Category
                </label>
                <Select
                  id="report-type"
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as ReportType)}
                  options={[
                    { value: 'sales', label: 'Sales & POS Transactions' },
                    { value: 'inventory', label: 'Inventory Balances & Low Stock' },
                    ...(hasRole('owner')
                      ? [{ value: 'profitability', label: 'Profitability Analysis (Owner Only)' }]
                      : []),
                    { value: 'supplier', label: 'Supplier Procurement Performance' },
                  ]}
                  className="h-11 w-full text-sm"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="start-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  From Date
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 w-full text-sm"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label
                  htmlFor="end-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  To Date
                </label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 w-full text-sm"
                />
              </div>
            </div>

            {/* Quick Date Presets Strip (Mobile-Friendly Pill Buttons) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Quick:</span>
              </span>
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'Last 7 Days' },
                { key: 'month', label: 'This Month' },
                { key: 'year', label: 'Year to Date' },
                { key: 'all', label: 'All Records' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key as any)}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-brand-50 hover:border-brand-300 hover:text-brand-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                type="button"
                onClick={() => fetchReport(type, startDate, endDate)}
                loading={loading}
                leftIcon={<BarChart3 className="h-4 w-4" />}
                className="h-11 min-h-[44px] w-full sm:w-auto bg-brand-700 hover:bg-brand-800 text-white font-medium px-5 shadow-xs"
              >
                Generate Preview
              </Button>

              {/* Dedicated CSV & PDF Export Buttons */}
              <ExportButton
                type={type}
                startDate={startDate}
                endDate={endDate}
                className="w-full sm:w-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Executive KPI Summary Cards Strip */}
        {summaryMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {summaryMetrics.map((card, idx) => {
              const Icon = card.icon;
              return (
                <Card key={idx} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                        {card.label}
                      </p>
                      <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 truncate">
                        {card.value}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                        {card.detail}
                      </p>
                    </div>
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Data Table Preview Card */}
        <Card className="overflow-hidden">
          <CardHeader
            title={`${type.charAt(0).toUpperCase() + type.slice(1)} Report Preview`}
            description={loaded ? `${data.length} records found` : 'Generate a report to preview data'}
            action={
              loaded && data.length > 0 ? (
                <div className="flex items-center gap-2">
                  <ExportButton
                    type={type}
                    startDate={startDate}
                    endDate={endDate}
                    className="w-full sm:w-auto"
                  />
                </div>
              ) : undefined
            }
          />
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12">
                <PageLoader label="Generating report preview..." />
              </div>
            ) : !loaded || data.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="h-8 w-8 text-slate-400" />}
                title="No report records found"
                message="Try adjusting your date range or selecting a different report category above."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table
                  columns={columns.map((key) => ({
                    key,
                    header: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    accessor: (row: Record<string, unknown>) => renderCell(key, row[key]),
                  }))}
                  data={data}
                  keyExtractor={(row) =>
                    String(row.sale_id || row.product_id || row.supplier_id || Object.values(row).join('-'))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
