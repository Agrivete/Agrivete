'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui';

export interface MovementData {
  date: string;
  sales: number;
  receivings: number;
  adjustments: number;
}

export function StockMovementChart({ data = [] }: { data?: MovementData[] }) {
  if (data.length === 0) {
    return (
      <Card className="h-full min-w-0">
        <CardHeader title="Stock Movement (14 Days)" description="Daily stock in/out/adjustments" />
        <CardContent className="h-[240px] flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">No movement data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    sales: d.sales || 0,
    receivings: d.receivings || 0,
    adjustments: d.adjustments || 0,
  }));

  return (
    <Card className="h-full min-w-0">
      <CardHeader title="Stock Movement (14 Days)" description="Daily stock in/out/adjustments" />
      <CardContent>
        <div className="h-[240px] w-full text-slate-600 dark:text-slate-400">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  color: 'var(--card-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: 'var(--card-foreground)', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
              <Bar dataKey="sales" fill="#ef4444" name="Sales (Out)" radius={[4, 4, 0, 0]} maxBarSize={30} stackId="a" />
              <Bar dataKey="receivings" fill="#558b2f" name="Receivings (In)" radius={[4, 4, 0, 0]} maxBarSize={30} stackId="a" />
              <Bar dataKey="adjustments" fill="#7cb342" name="Adjustments" radius={[4, 4, 0, 0]} maxBarSize={30} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}