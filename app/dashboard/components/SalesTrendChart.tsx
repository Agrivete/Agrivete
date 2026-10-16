'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui';

interface SalesTrendData {
  date: string;
  revenue: number;
  transactions: number;
  total?: number;
}

async function getSalesTrend(): Promise<SalesTrendData[]> {
  const res = await fetch('/api/reports?type=sales&format=json&days=30');
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export async function SalesTrendChart() {
  const data = await getSalesTrend();

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Sales Trend (30 Days)" description="Daily revenue and transactions" />
        <CardContent className="h-[240px] flex items-center justify-center">
          <p className="text-slate-500">No sales data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    revenue: d.revenue || d.total || 0,
    transactions: d.transactions || 0,
  }));

  return (
    <Card className="h-full">
      <CardHeader title="Sales Trend (30 Days)" description="Daily revenue and transactions" />
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#737373' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#737373' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value >= 1000 ? `₱${(value / 1000).toFixed(1)}k` : `₱${value}`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: '#18231a', fontWeight: 600 }}
                formatter={(value: any) => [`₱${(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Revenue']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#558b2f"
                strokeWidth={2}
                dot={{ fill: '#558b2f', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="transactions"
                stroke="#7cb342"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#7cb342', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Transactions"
                yAxisId="right"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}