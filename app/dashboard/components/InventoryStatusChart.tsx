'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui';

export interface InventoryStatusData {
  healthy: number;
  lowStock: number;
  outOfStock: number;
}

export function InventoryStatusChart({
  data = { healthy: 0, lowStock: 0, outOfStock: 0 },
}: {
  data?: InventoryStatusData;
}) {
  const total = data.healthy + data.lowStock + data.outOfStock;

  if (total === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Inventory Status" description="Stock health overview" />
        <CardContent className="h-[240px] flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">No inventory data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Healthy', value: data.healthy, color: '#558b2f' },
    { name: 'Low Stock', value: data.lowStock, color: '#f59e0b' },
    { name: 'Out of Stock', value: data.outOfStock, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const renderCenterLabel = ({ cx, cy, index }: { cx: number; cy: number; index: number }) => {
    if (index !== 0) return null;
    const primarySlice = chartData[0];
    const displayText =
      chartData.length === 1
        ? `${primarySlice.name} 100%`
        : `${Math.round((data.healthy / total) * 100)}% Healthy`;

    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-800 dark:fill-slate-100 font-semibold text-xs select-none"
      >
        {displayText}
      </text>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader title="Inventory Status" description="Stock health overview" />
      <CardContent>
        <div className="h-[240px] w-full flex flex-col items-center justify-center text-slate-700 dark:text-slate-300">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={chartData.length > 1 ? 2 : 0}
                dataKey="value"
                nameKey="name"
                label={renderCenterLabel}
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartData[index].color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  color: 'var(--card-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: any) => [(value ?? 0).toString(), 'Products']}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: '20px', color: 'var(--foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}