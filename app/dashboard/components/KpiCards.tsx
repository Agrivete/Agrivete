import { api } from '@/lib/api';
import { DollarSign, ShoppingCart, Package, CalendarClock, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

interface DashboardData {
  kpis: {
    todaysRevenue: number;
    todaysTransactions: number;
    todaysItemsSold: number;
    monthlyRevenue: number;
    totalProducts: number;
    lowStockCount: number;
    expiringCount: number;
    todaysProfit?: number;
    todaysCost?: number;
    todaysMargin?: number;
    monthlyProfit?: number;
  };
}

async function getDashboardData(): Promise<DashboardData> {
  const res = await api.get<DashboardData>('/api/dashboard');
  return res;
}

interface KpiCardsProps {
  userRole: 'owner' | 'manager' | 'staff' | null;
}

export async function KpiCards({ userRole }: KpiCardsProps) {
  const data = await getDashboardData();
  const kpis = data.kpis;
  const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const hasRole = (role: 'owner' | 'manager' | 'staff') => userRole === role;

  const cards = [
    { label: "Today's Sales", value: peso(kpis.todaysRevenue), detail: `${kpis.todaysTransactions} transactions`, icon: DollarSign, bg: 'bg-emerald-50 text-emerald-700' },
    { label: 'Items Sold Today', value: kpis.todaysItemsSold.toLocaleString(), detail: 'across all sales', icon: ShoppingCart, bg: 'bg-sky-50 text-sky-700' },
    { label: 'Total Products', value: kpis.totalProducts.toString(), detail: `${kpis.lowStockCount} low stock`, icon: Package, bg: 'bg-violet-50 text-violet-700' },
    { label: 'Expiring Soon', value: kpis.expiringCount.toString(), detail: 'within 30 days', icon: CalendarClock, bg: 'bg-orange-50 text-orange-600' },
  ];

  const ownerCards = [
    { label: "Today's Profit", value: peso(kpis.todaysProfit ?? 0), detail: `margin ${(kpis.todaysMargin ?? 0).toFixed(1)}%`, icon: TrendingUp, bg: 'bg-emerald-50 text-emerald-700' },
    { label: "Today's Cost", value: peso(kpis.todaysCost ?? 0), detail: 'COGS', icon: Wallet, bg: 'bg-slate-100 text-slate-700' },
    { label: 'Monthly Revenue', value: peso(kpis.monthlyRevenue), detail: `profit ${peso(kpis.monthlyProfit ?? 0)}`, icon: TrendingUp, bg: 'bg-brand-50 text-brand-700' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                  <p className="truncate text-xl font-bold text-slate-900">{card.value}</p>
                  <p className="text-[11px] text-slate-400">{card.detail}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasRole('owner') && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ownerCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="border-brand-200 bg-brand-50/40">
                <CardContent className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.bg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">{card.label}</p>
                    <p className="truncate text-xl font-bold text-slate-900">{card.value}</p>
                    <p className="text-[11px] text-slate-400">{card.detail}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}