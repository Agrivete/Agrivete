import { serverApi } from '@/lib/serverApi';
import { Card, CardHeader, CardContent, Table, StatusBadge } from '@/components/ui';

interface DashboardData {
  recentSales: Array<{
    saleId: string;
    date: string;
    total: number;
    paymentMethod: string;
    status: string;
    customerName: string;
    items: unknown[];
  }>;
}

async function getDashboardData(): Promise<DashboardData> {
  const res = await serverApi.get<DashboardData>('/api/dashboard');
  return res;
}

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function RecentSales() {
  const data = await getDashboardData();

  return (
    <Card className="min-w-0">
      <CardHeader title="Recent Sales" description="Latest completed transactions" />
      <CardContent className="p-0">
        <Table
          columns={[
            { key: 'saleId', header: 'Sale ID', accessor: (r) => <code className="text-xs text-neutral-500">{r.saleId}</code> },
            { key: 'customerName', header: 'Customer', accessor: (r) => r.customerName || '—' },
            { key: 'date', header: 'Date', accessor: (r) => new Date(r.date).toLocaleString('en-PH') },
            { key: 'items', header: 'Items', accessor: (r) => r.items.length },
            { key: 'total', header: 'Total', accessor: (r) => <span className="font-semibold">{peso(r.total)}</span> },
            { key: 'paymentMethod', header: 'Payment', accessor: (r) => <StatusBadge status={r.paymentMethod} /> },
            { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
          ]}
          data={data.recentSales}
          keyExtractor={(r) => r.saleId}
          emptyMessage="No sales yet today"
        />
      </CardContent>
    </Card>
  );
}