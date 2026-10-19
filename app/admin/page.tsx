'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Building2, Clock, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Button, Badge, EmptyState, TableSkeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

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

interface PendingOwnerRecord {
  userId: string;
  name: string;
  businessName?: string;
  email: string;
  role: 'owner' | 'manager' | 'staff' | 'admin';
  status: 'pending' | 'active' | 'inactive';
  createdAt?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<PendingOwnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PendingOwnerRecord[]>('/api/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/admin');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    loadUsers();
  }, [authLoading, user, router, loadUsers]);

  const handleApprove = async (target: PendingOwnerRecord) => {
    setApprovingId(target.userId);
    try {
      await api.post('/api/admin/approve', { userId: target.userId });
      toast.success(`Approved ${target.businessName || target.name}`);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  const pendingOwners = users.filter((u) => u.role === 'owner' && u.status === 'pending');
  const activeOwners = users.filter((u) => u.role === 'owner' && u.status === 'active');

  if (authLoading || (user && user.role !== 'admin')) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <TableSkeleton rows={5} cols={5} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Platform Admin Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve Agrivet business owner registrations across the platform.
            </p>
          </div>
          <Button variant="secondary" onClick={loadUsers} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5 flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Pending Approvals</p>
              <p className="text-2xl font-bold text-neutral-900 tabular-nums">{pendingOwners.length}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Active Businesses</p>
              <p className="text-2xl font-bold text-neutral-900 tabular-nums">{activeOwners.length}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Total Platform Users</p>
              <p className="text-2xl font-bold text-neutral-900 tabular-nums">{users.length}</p>
            </div>
          </Card>
        </div>

        {/* Pending Approvals Table */}
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Pending Approvals</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Business owners waiting for platform verification before they can sign in.
              </p>
            </div>
            <Badge variant={pendingOwners.length > 0 ? 'warning' : 'success'}>
              {pendingOwners.length} pending
            </Badge>
          </div>

          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={4} cols={5} />
            </div>
          ) : pendingOwners.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="No pending business approvals"
              message="All registered Agrivet business owners have been reviewed."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Owner Name</th>
                    <th>Email</th>
                    <th>Date Registered</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOwners.map((owner) => (
                    <tr key={owner.userId}>
                      <td className="font-semibold text-neutral-900">
                        {owner.businessName || 'Agrivet Store'}
                      </td>
                      <td className="font-medium text-neutral-800">{owner.name}</td>
                      <td className="text-neutral-600">{owner.email}</td>
                      <td className="text-xs text-neutral-500">
                        {owner.createdAt ? formatDateTime(owner.createdAt) : '—'}
                      </td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(owner)}
                          loading={approvingId === owner.userId}
                          disabled={approvingId === owner.userId}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
