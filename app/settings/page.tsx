'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { KeyRound, RefreshCw, Database, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardHeader, CardContent, Input, Button, Badge, PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';

interface SyncStatus {
  pendingCount: number;
  breakdown: { sales: number; receivings: number; movements: number };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [syncLoading, setSyncLoading] = useState(true);

  const loadSync = useCallback(async () => {
    setSyncLoading(true);
    try {
      const res = await api.get<SyncStatus>('/api/sync');
      setSync(res);
    } catch {
      setSync(null);
    } finally {
      setSyncLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSync();
  }, [loadSync]);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setChanging(true);
    try {
      await api.patch(`/api/users/${user.userId}`, {
        action: 'change_password',
        currentPassword,
        newPassword,
      });
      toast('Password changed', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Password change failed', 'error');
    } finally {
      setChanging(false);
    }
  };

  const runSync = async () => {
    try {
      const pending = await (await import('@/lib/offlineQueue')).getPending();
      if (pending.length === 0) {
        toast('No pending offline transactions', 'info');
        await loadSync();
        return;
      }
      const result = await (await import('@/lib/offlineQueue')).syncPending(
        localStorage.getItem('agrivet_token') || ''
      );
      toast(`Sync complete: ${result.synced} synced, ${result.failed} failed`, result.failed ? 'error' : 'success');
      await loadSync();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Sync failed', 'error');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
          <p className="text-xs text-slate-500">Account security and data continuity</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Profile" description="Signed-in account" />
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                  {user?.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <Badge variant={user?.role === 'owner' ? 'default' : user?.role === 'manager' ? 'info' : 'neutral'}>
                  {user?.role}
                </Badge>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                JWT session · httpOnly cookie · RBAC enforced server-side
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Change Password" description="Minimum 6 characters" />
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4">
                <Input
                  label="Current password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  label="New password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button type="submit" loading={changing} leftIcon={<KeyRound className="h-4 w-4" />}>
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Offline Sync Queue"
              description="IndexedDB queue · BR08 duplicate prevention"
              action={<RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''} text-slate-400`} />}
            />
            <CardContent className="space-y-4">
              {syncLoading ? (
                <PageLoader />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{sync?.pendingCount ?? 0}</p>
                      <p className="text-[11px] font-medium text-amber-600">Pending</p>
                    </div>
                    <div className="rounded-xl bg-sky-50 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-sky-700">{sync?.breakdown.sales ?? 0}</p>
                      <p className="text-[11px] font-medium text-sky-600">Sales</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-violet-700">{(sync?.breakdown.receivings ?? 0) + (sync?.breakdown.movements ?? 0)}</p>
                      <p className="text-[11px] font-medium text-violet-600">Other</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={runSync} leftIcon={<RefreshCw className="h-4 w-4" />}>
                    Sync now
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Backup & Recovery" description="Automated daily backups (02:00)" />
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-700">JSON-per-collection backups</p>
                  <p className="mt-1">
                    30-day retention · manifest verification · stored in <code className="rounded bg-slate-200 px-1">backups/</code> on the
                    server. Trigger manually from the server with <code className="rounded bg-slate-200 px-1">npm run backup</code>.
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Data Privacy Act (RA 10173): credentials are bcrypt-hashed; audit trails record every stock-changing event.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
