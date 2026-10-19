'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui';

export interface TopProductData {
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export function TopProductsChart({ data = [] }: { data?: TopProductData[] }) {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Top Selling Products" description="Top 5 by quantity sold (30 days)" />
        <CardContent className="h-[240px] flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">No product data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 5).map((d) => ({
    name: d.productName.length > 20 ? d.productName.substring(0, 20) + '...' : d.productName,
    quantity: d.totalQuantity || 0,
    fullName: d.productName,
  }));

  const colors = ['#558b2f', '#7cb342', '#8bc34a', '#9ccc65', '#aed581'];

  return (
    <Card className="h-full">
      <CardHeader title="Top Selling Products" description="Top 5 by quantity sold (30 days)" />
      <CardContent>
        <div className="h-[240px] w-full text-slate-600 dark:text-slate-400">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--foreground)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  color: 'var(--card-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: 'var(--card-foreground)', fontWeight: 600 }}
                formatter={(value: any, name: any) => [
                  (value ?? 0).toLocaleString(),
                  name === 'quantity' ? 'Units Sold' : 'Revenue',
                ]}
              />
              <Bar dataKey="quantity" radius={[0, 4, 4, 0]} maxBarSize={40}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}