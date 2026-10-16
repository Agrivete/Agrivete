import { serverApi } from '@/lib/serverApi';
import { Card, CardHeader, CardContent, Table, Badge } from '@/components/ui';

interface AlertData {
  expiring: Array<{
    productId: string;
    productName: string;
    category?: string;
    lotNo: string;
    expirationDate: string;
    daysUntilExpiry: number;
    quantity: number;
  }>;
}

async function getAlerts(): Promise<AlertData> {
  const res = await serverApi.get<AlertData>('/api/alerts');
  return res;
}

export async function ExpiringList() {
  const alerts = await getAlerts();

  return (
    <Card className="h-full min-h-[280px]">
      <CardHeader title="Expiring Products" description="Within 30-day window (BR05) · FEFO order" />
      <CardContent className="p-0">
        <Table
          columns={[
            { key: 'productName', header: 'Product', accessor: (r) => <span className="font-medium text-neutral-900">{r.productName}</span> },
            { key: 'lotNo', header: 'Lot #', accessor: (r) => <code className="text-xs text-slate-500">{r.lotNo}</code> },
            { key: 'daysUntilExpiry', header: 'Days Left', accessor: (r) => (
              <Badge variant={r.daysUntilExpiry <= 7 ? 'danger' : r.daysUntilExpiry <= 14 ? 'warning' : 'info'}>
                {r.daysUntilExpiry}d
              </Badge>
            ) },
            { key: 'quantity', header: 'Qty', accessor: (r) => r.quantity },
          ]}
          data={alerts.expiring.slice(0, 8)}
          keyExtractor={(r) => `${r.productId}-${r.lotNo}`}
          emptyMessage="Nothing expiring within 30 days"
        />
      </CardContent>
    </Card>
  );
}