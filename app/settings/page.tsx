'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { KeyRound, RefreshCw, Database, ShieldCheck, Scale, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardHeader, CardContent, Input, Button, Badge, PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import {
  getAttention,
  syncPending,
  retryEntry,
  discardEntry,
  QUEUE_CHANGE_EVENT,
} from '@/lib/offlineQueue';

interface AttentionEntry {
  localId: string;
  type: string;
  timestamp: string;
  status: 'rejected' | 'flagged';
  reason?: string | null;
}

interface SyncStatus {
  pendingCount: number;
  breakdown: { sales: number; receivings: number; movements: number };
}

interface ReconciliationDetail {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  liveBalance: number;
  ledgerSum: number;
  drift: number;
  movementCount: number;
  status: 'matched' | 'discrepant';
}

interface ReconciliationReport {
  auditedAt: string;
  totalProducts: number;
  matchedCount: number;
  discrepanciesCount: number;
  zeroDriftVerified: boolean;
  discrepancies: Array<{
    productId: string;
    productName: string;
    liveBalance: number;
    ledgerSum: number;
    drift: number;
  }>;
  details: ReconciliationDetail[];
}

export default function SettingsPage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [attention, setAttention] = useState<AttentionEntry[]>([]);
  const [syncLoading, setSyncLoading] = useState(true);

  // DB-02 / IR-08: Zero-Drift Balance Reconciliation
  const [reconReport, setReconReport] = useState<ReconciliationReport | null>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [showReconDetails, setShowReconDetails] = useState(false);

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
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setChanging(false);
    }
  };

  const loadAttention = useCallback(async () => {
    try {
      setAttention((await getAttention()) as AttentionEntry[]);
    } catch {
      setAttention([]);
    }
  }, []);

  useEffect(() => {
    loadAttention();
    window.addEventListener(QUEUE_CHANGE_EVENT, loadAttention);
    return () => window.removeEventListener(QUEUE_CHANGE_EVENT, loadAttention);
  }, [loadAttention]);

  const runSync = async () => {
    try {
      const result = await syncPending({ force: true });
      if ('offline' in result && result.offline) {
        toast.info('You are offline. Items stay queued and sync automatically when you reconnect.', { id: 'sync-toast' });
      } else if (result.rejected || result.flagged) {
        toast.error(
          `Sync: ${result.synced} synced, ${result.flagged} flagged, ${result.rejected} rejected. Review them below.`,
          { id: 'sync-toast' }
        );
      } else if (result.synced === 0) {
        toast.info('No pending offline transactions', { id: 'sync-toast' });
      } else {
        toast.success(`Sync complete: ${result.synced} synced`, { id: 'sync-toast' });
      }
      await loadSync();
      await loadAttention();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed', { id: 'sync-toast' });
    }
  };

  const runReconciliationAudit = async () => {
    setReconLoading(true);
    try {
      const res = await api.get<ReconciliationReport>('/api/admin/reconcile');
      setReconReport(res);
      if (res.zeroDriftVerified) {
        toast.success('Zero-drift verified: All on-hand balances match movement ledgers (DB-02)');
      } else {
        toast.error(`Discrepancy detected in ${res.discrepanciesCount} product(s)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reconciliation audit failed');
    } finally {
      setReconLoading(false);
    }
  };

  const repairDiscrepancies = async () => {
    setRepairing(true);
    try {
      const res = await api.post<{ message: string; repairedCount: number }>('/api/admin/reconcile', {});
      toast.success(res.message);
      await runReconciliationAudit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Repair failed');
    } finally {
      setRepairing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings &amp; Audit</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Account security, offline sync, and database integrity</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Profile Card */}
          <Card>
            <CardHeader title="Profile" description="Signed-in account" />
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                  {user?.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                  <p className="text-[11px] font-medium text-brand-700 dark:text-brand-400 mt-0.5">{user?.businessName || 'Agrivet Store'}</p>
                </div>
                <Badge variant={user?.role === 'owner' ? 'default' : user?.role === 'manager' ? 'info' : 'neutral'}>
                  {user?.role}
                </Badge>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>JWT session • httpOnly cookie • Multi-tenant RBAC enforced</span>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
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

          {/* DB-02 / IR-08 Zero-Drift Balance Reconciliation Card (Owner/Admin) */}
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <Card className="xl:col-span-2">
              <CardHeader
                title="Zero-Drift Inventory Reconciliation (DB-02)"
                description="Mathematically verify that live stock balances equal the sum of immutable movement ledgers"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={runReconciliationAudit}
                    loading={reconLoading}
                    leftIcon={<Scale className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
                  >
                    Run Audit Now
                  </Button>
                }
              />
              <CardContent className="space-y-4">
                {!reconReport && !reconLoading && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                    <Scale className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" />
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Click &ldquo;Run Audit Now&rdquo; to calculate real-time drift between live balances and historical transactions.
                    </p>
                  </div>
                )}

                {reconLoading && <PageLoader />}

                {reconReport && !reconLoading && (
                  <div className="space-y-4">
                    {/* Status Banner */}
                    {reconReport.zeroDriftVerified ? (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold">Zero-Drift Invariant Verified (DB-02)</p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            All {reconReport.totalProducts} catalog products match their historical stock movement ledgers with exactly 0.0 drift.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                          <div>
                            <p className="text-xs font-bold">Drift Discrepancy Detected</p>
                            <p className="text-[11px] text-red-700 dark:text-red-400">
                              {reconReport.discrepanciesCount} product(s) have unaligned live balances.
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={repairDiscrepancies}
                          loading={repairing}
                        >
                          Auto-Repair via Audited Movements
                        </Button>
                      </div>
                    )}

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{reconReport.totalProducts}</p>
                        <p className="text-[10px] uppercase font-semibold text-slate-500">Products Checked</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{reconReport.matchedCount}</p>
                        <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Matched (0 Drift)</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-950/30">
                        <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{reconReport.discrepanciesCount}</p>
                        <p className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Discrepancies</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(reconReport.auditedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] uppercase font-semibold text-slate-500">Last Audit Time</p>
                      </div>
                    </div>

                    {/* Toggle Detailed Breakdown */}
                    <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowReconDetails(!showReconDetails)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400"
                      >
                        {showReconDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        <span>{showReconDetails ? 'Hide' : 'Show'} Itemized Balance Breakdown ({reconReport.details.length})</span>
                      </button>

                      {showReconDetails && (
                        <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                              <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="p-2.5">Product Name</th>
                                <th className="p-2.5 text-right">Live Stock</th>
                                <th className="p-2.5 text-right">Ledger Sum</th>
                                <th className="p-2.5 text-right">Drift</th>
                                <th className="p-2.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {reconReport.details.map((item) => (
                                <tr key={item.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                  <td className="p-2.5">
                                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</span>
                                    <span className="block text-[10px] text-slate-400 font-mono">{item.productId}</span>
                                  </td>
                                  <td className="p-2.5 text-right font-medium">{item.liveBalance} {item.unit}</td>
                                  <td className="p-2.5 text-right font-medium">{item.ledgerSum} {item.unit}</td>
                                  <td className={`p-2.5 text-right font-bold ${item.drift === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                                    {item.drift === 0 ? '0' : item.drift}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.status === 'matched' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800'}`}>
                                      {item.status === 'matched' ? 'MATCH' : 'DRIFT'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Offline Queue Status */}
          <Card>
            <CardHeader
              title="Offline Sync Queue"
              description="IndexedDB outbox • BR08 duplicate prevention"
              action={<RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''} text-slate-400`} />}
            />
            <CardContent className="space-y-4">
              {syncLoading ? (
                <PageLoader />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-center dark:bg-amber-950/30">
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{sync?.pendingCount ?? 0}</p>
                      <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Pending</p>
                    </div>
                    <div className="rounded-xl bg-sky-50 px-4 py-3 text-center dark:bg-sky-950/30">
                      <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{sync?.breakdown.sales ?? 0}</p>
                      <p className="text-[11px] font-medium text-sky-600 dark:text-sky-400">Sales</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 px-4 py-3 text-center dark:bg-violet-950/30">
                      <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
                        {(sync?.breakdown.receivings ?? 0) + (sync?.breakdown.movements ?? 0)}
                      </p>
                      <p className="text-[11px] font-medium text-violet-600 dark:text-violet-400">Other</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={runSync} leftIcon={<RefreshCw className="h-4 w-4" />}>
                    Sync now
                  </Button>
                  {attention.length > 0 && (
                    <div className="space-y-2" aria-label="Offline items needing review">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Needs your attention</p>
                      {attention.map((entry) => (
                        <div
                          key={entry.localId}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {entry.type} · {new Date(entry.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                            </span>
                            <Badge variant={entry.status === 'flagged' ? 'warning' : 'danger'}>{entry.status}</Badge>
                          </div>
                          <p className="mt-1 text-slate-600 dark:text-slate-300">
                            {entry.reason || 'Needs review'}.{' '}
                            {entry.status === 'flagged'
                              ? 'Check stock, then retry or discard.'
                              : 'Fix the cause or discard this entry.'}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => retryEntry(entry.localId)}>
                              Retry
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => discardEntry(entry.localId)}>
                              Discard entry
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Backup & Recovery Card */}
          <Card>
            <CardHeader title="Backup &amp; Recovery" description="Automated daily backups (02:00)" />
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">JSON-per-collection backups</p>
                  <p className="mt-1">
                    30-day retention • manifest verification • stored in <code className="rounded bg-slate-200 px-1 dark:bg-slate-700 font-mono">backups/</code> on the
                    server. Trigger manually from the terminal with <code className="rounded bg-slate-200 px-1 dark:bg-slate-700 font-mono">npm run backup</code>.
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
