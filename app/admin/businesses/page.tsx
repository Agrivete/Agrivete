'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardHeader, CardContent, Button, Badge, StatusBadge, Table, EmptyState, TableSkeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

interface BusinessTenantRecord {
  userId: string;
  name: string;
  businessName?: string;
  email: string;
  role: 'owner' | 'manager' | 'staff' | 'admin';
  status: 'pending' | 'active' | 'inactive';
  createdAt?: string;
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminBusinessesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<BusinessTenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<BusinessTenantRecord[]>('/api/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/admin/businesses');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    loadBusinesses();
  }, [authLoading, user, router, loadBusinesses]);

  const handleApprove = async (target: BusinessTenantRecord) => {
    setApprovingId(target.userId);
    try {
      await api.post('/api/admin/approve', { userId: target.userId });
      toast.success(`Approved ${target.businessName || target.name}`);
      await loadBusinesses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  const businesses = users.filter((u) => u.role === 'owner');
  const activeCount = businesses.filter((b) => b.status === 'active').length;
  const pendingCount = businesses.filter((b) => b.status === 'pending').length;
  const inactiveCount = businesses.filter((b) => b.status === 'inactive').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Registered Businesses</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All Agrivet tenant businesses registered on the platform.
            </p>
          </div>
          <Button variant="secondary" onClick={loadBusinesses} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5 flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Businesses</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{activeCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Review</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{pendingCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Inactive Businesses</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{inactiveCount}</p>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="All Registered Businesses"
            description={`${businesses.length} tenant business${businesses.length === 1 ? '' : 'es'}`}
            action={
              <Badge variant="info">
                {businesses.length} total
              </Badge>
            }
          />
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={5} cols={5} />
              </div>
            ) : businesses.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title="No registered businesses"
                message="Registered Agrivet businesses will appear here once owners sign up."
              />
            ) : (
              <Table
                columns={[
                  {
                    key: 'businessName',
                    header: 'Business Name',
                    accessor: (r) => (
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {r.businessName || 'Agrivet Store'}
                      </span>
                    ),
                  },
                  {
                    key: 'name',
                    header: 'Owner Name',
                    accessor: (r) => (
                      <span className="font-medium text-slate-800 dark:text-slate-200">{r.name}</span>
                    ),
                  },
                  {
                    key: 'email',
                    header: 'Email',
                    accessor: (r) => (
                      <span className="text-slate-600 dark:text-slate-300">{r.email}</span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    accessor: (r) => <StatusBadge status={r.status} />,
                  },
                  {
                    key: 'createdAt',
                    header: 'Date Registered',
                    accessor: (r) => (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(r.createdAt)}
                      </span>
                    ),
                  },
                  {
                    key: 'action',
                    header: 'Action',
                    accessor: (r) =>
                      r.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(r)}
                          loading={approvingId === r.userId}
                          disabled={approvingId === r.userId}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">Approved</span>
                      ),
                  },
                ]}
                data={businesses}
                keyExtractor={(r) => r.userId}
                emptyMessage="No registered businesses found"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

