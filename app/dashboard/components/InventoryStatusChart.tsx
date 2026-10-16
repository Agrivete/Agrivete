'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui';

interface InventoryStatusData {
  healthy: number;
  lowStock: number;
  outOfStock: number;
}

async function getInventoryStatus(): Promise<InventoryStatusData> {
  const res = await fetch('/api/inventory?format=json');
  if (!res.ok) return { healthy: 0, lowStock: 0, outOfStock: 0 };
  const data = await res.json();
  const products = data.products || [];
  
  let healthy = 0, lowStock = 0, outOfStock = 0;
  products.forEach((p: any) => {
    if (p.quantityOnHand <= 0) outOfStock++;
    else if (p.quantityOnHand <= (p.lowStockThreshold || 5)) lowStock++;
    else healthy++;
  });
  
  return { healthy, lowStock, outOfStock };
}

export async function InventoryStatusChart() {
  const data = await getInventoryStatus();
  const total = data.healthy + data.lowStock + data.outOfStock;

  if (total === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Inventory Status" description="Stock health overview" />
        <CardContent className="h-[240px] flex items-center justify-center">
          <p className="text-slate-500">No inventory data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Healthy', value: data.healthy, color: '#558b2f' },
    { name: 'Low Stock', value: data.lowStock, color: '#f59e0b' },
    { name: 'Out of Stock', value: data.outOfStock, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <Card className="h-full">
      <CardHeader title="Inventory Status" description="Stock health overview" />
      <CardContent>
        <div className="h-[240px] w-full flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartData[index].color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [(value ?? 0).toString(), 'Products']}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}