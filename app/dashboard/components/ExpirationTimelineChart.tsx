'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui';

export interface ExpirationData {
  productName: string;
  lotNo: string;
  expirationDate: string;
  daysUntilExpiry: number;
  quantity: number;
}

export function ExpirationTimelineChart({ data = [] }: { data?: ExpirationData[] }) {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Expiration Timeline" description="Products expiring in 7-day buckets (30 days)" />
        <CardContent className="h-[240px] flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">No expiring products</p>
        </CardContent>
      </Card>
    );
  }

  const buckets = {
    '0-7': 0,
    '8-14': 0,
    '15-21': 0,
    '22-30': 0,
  };

  data.forEach((item) => {
    if (item.daysUntilExpiry <= 7) buckets['0-7'] += item.quantity;
    else if (item.daysUntilExpiry <= 14) buckets['8-14'] += item.quantity;
    else if (item.daysUntilExpiry <= 21) buckets['15-21'] += item.quantity;
    else buckets['22-30'] += item.quantity;
  });

  const chartData = Object.entries(buckets).map(([range, qty]) => ({
    range,
    quantity: qty,
  }));

  const colors = ['#ef4444', '#f59e0b', '#7cb342', '#558b2f'];

  return (
    <Card className="h-full">
      <CardHeader title="Expiration Timeline" description="Products expiring in 7-day buckets (30 days)" />
      <CardContent>
        <div className="h-[240px] w-full text-slate-600 dark:text-slate-400">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value.toLocaleString()}
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
                formatter={(value: any) => [(value ?? 0).toLocaleString(), 'Units Expiring']}
              />
              <Bar dataKey="quantity" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}