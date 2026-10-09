import { serverApi } from '@/lib/serverApi';
import { Card, CardHeader, CardContent, Table, Badge } from '@/components/ui';

interface AlertData {
  lowStock: Array<{
    productId: string;
    name: string;
    category: string;
    unit: string;
    quantityOnHand: number;
    lowStockThreshold: number;
    shortage: number;
  }>;
}

async function getAlerts(): Promise<AlertData> {
  const res = await serverApi.get<AlertData>('/api/alerts');
  return res;
}

export async function LowStockTable() {
  const alerts = await getAlerts();

  return (
    <Card>
      <CardHeader title="Low Stock Products" description="At or below configured threshold (BR04)" />
      <CardContent className="p-0">
        <Table
          columns={[
            { key: 'name', header: 'Product', accessor: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { key: 'category', header: 'Category', accessor: (r) => <Badge variant="neutral">{r.category}</Badge> },
            { key: 'quantityOnHand', header: 'On Hand', accessor: (r) => <span className="font-semibold text-red-600">{r.quantityOnHand}</span> },
            { key: 'lowStockThreshold', header: 'Threshold', accessor: (r) => r.lowStockThreshold },
            { key: 'shortage', header: 'Shortage', accessor: (r) => <Badge variant="danger">-{r.shortage}</Badge> },
          ]}
          data={alerts.lowStock.slice(0, 8)}
          keyExtractor={(r) => r.productId}
          emptyMessage="No low stock products"
        />
      </CardContent>
    </Card>
  );
}