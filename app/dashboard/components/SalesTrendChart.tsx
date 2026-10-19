'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui';

export interface SalesTrendData {
  date: string;
  revenue: number;
  transactions: number;
  total?: number;
}

export function SalesTrendChart({ data = [] }: { data?: SalesTrendData[] }) {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Sales Trend (30 Days)" description="Daily revenue and transactions" />
        <CardContent className="h-[240px] flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">No sales data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    revenue: d.revenue || d.total || 0,
    transactions: d.transactions || 0,
  }));

  const tooltipContentStyle = {
    backgroundColor: 'var(--card)',
    color: 'var(--card-foreground)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    padding: '8px 12px',
  };

  const tooltipFormatter = (value: any, name: any) =>
    name === 'Revenue'
      ? [`₱${(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Revenue']
      : [(value ?? 0).toLocaleString(), 'Transactions'];

  // When only 1 data point is available, render a BarChart so it displays clear, elegant bars instead of floating dots
  if (chartData.length < 2) {
    return (
      <Card className="h-full">
        <CardHeader title="Sales Trend (30 Days)" description="Daily revenue and transactions" />
        <CardContent>
          <div className="h-[240px] w-full text-slate-600 dark:text-slate-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => (value >= 1000 ? `₱${(value / 1000).toFixed(1)}k` : `₱${value}`)}
                />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={tooltipContentStyle}
                  labelStyle={{ color: 'var(--card-foreground)', fontWeight: 600, marginBottom: '4px' }}
                  formatter={tooltipFormatter}
                />
                <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
                <Bar dataKey="revenue" fill="#558b2f" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar
                  dataKey="transactions"
                  fill="#7cb342"
                  name="Transactions"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                  yAxisId="right"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader title="Sales Trend (30 Days)" description="Daily revenue and transactions" />
      <CardContent>
        <div className="h-[240px] w-full text-slate-600 dark:text-slate-400">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                tickFormatter={(value) => (value >= 1000 ? `₱${(value / 1000).toFixed(1)}k` : `₱${value}`)}
              />
              <YAxis yAxisId="right" orientation="right" hide />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={{ color: 'var(--card-foreground)', fontWeight: 600, marginBottom: '4px' }}
                formatter={tooltipFormatter}
              />
              <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
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