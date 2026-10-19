'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Shield, KeyRound, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card, CardHeader, CardContent, Table, Badge, StatusBadge, Button, Input, Select, Modal, PageLoader, ConfirmModal, EmptyState,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

interface UserRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser, hasRole } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [createModal, setCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'staff' | 'manager'>('staff');
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const [passwordTarget, setPasswordTarget] = useState<UserRow | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<UserRow[]>('/api/users');
      setUsers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!hasRole('owner')) {
    return (
      <AppLayout>
        <EmptyState title="Owner only" message="User management requires the owner role" />
      </AppLayout>
    );
  }

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/users', { name, email, password, role });
      toast.success(`User ${name} created (${role})`);
      setCreateModal(false);
      setName(''); setEmail(''); setPassword(''); setRole('staff');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const saveUser = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/users/${editTarget.userId}`, { role: editRole, status: editStatus });
      toast.success('User updated');
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;
    setChangingPassword(true);
    try {
      await api.patch(`/api/users/${passwordTarget.userId}`, {
        action: 'change_password',
        currentPassword,
        newPassword,
      });
      toast.success('Password changed');
      setPasswordTarget(null);
      setCurrentPassword(''); setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleDeactivate = async () => {
    if (!deactivateTarget) return;
    setSubmitting(true);
    try {
      const newStatus = deactivateTarget.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/api/users/${deactivateTarget.userId}`, { status: newStatus });
      if (newStatus === 'active') {
        toast.success('User reactivated');
      } else {
        toast.success('User deactivated');
      }
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
            <p className="text-xs text-slate-500">Owner-only · role-based access control</p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateModal(true)}>
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader title="Accounts" description={`${users.length} users`} />
          <CardContent className="p-0">
            {loading ? (
              <PageLoader />
            ) : (
              <Table
                columns={[
                  { key: 'name', header: 'User', accessor: (r) => (
                    <div>
                      <span className="font-medium text-slate-900">{r.name}</span>
                      <span className="block text-[11px] text-slate-400">{r.email}</span>
                    </div>
                  ) },
                  { key: 'userId', header: 'User ID', accessor: (r) => <code className="text-xs text-slate-500">{r.userId}</code> },
                  { key: 'role', header: 'Role', accessor: (r) => <Badge variant={r.role === 'owner' ? 'default' : r.role === 'manager' ? 'info' : 'neutral'}>{r.role}</Badge> },
                  { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
                  { key: 'lastLoginAt', header: 'Last Login', accessor: (r) => r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString('en-PH') : 'Never' },
                  {
                    key: 'actions', header: 'Actions',
                    accessor: (r) => (
                      <div className="flex items-center gap-1">
                        {r.userId !== currentUser?.userId && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditTarget(r); setEditRole(r.role); setEditStatus(r.status); }}>
                              <Shield className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setDeactivateTarget(r); }} title={r.status === 'active' ? 'Deactivate' : 'Reactivate'}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setPasswordTarget(r); setCurrentPassword(''); setNewPassword(''); }} title="Change password">
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={users}
                keyExtractor={(r) => r.userId}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Add User"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button onClick={createUser} loading={submitting}>Create user</Button>
          </>
        }
      >
        <form onSubmit={createUser} className="space-y-4">
          <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            options={[
              { value: 'staff', label: 'Staff / Cashier — sales & monitoring only' },
              { value: 'manager', label: 'Manager — operational access' },
            ]}
          />
          <p className="text-[11px] text-slate-400">New owners can only be created by existing owners via self-registration controls.</p>
        </form>
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit User"
        description={editTarget?.name}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={saveUser} loading={submitting}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Role"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'manager', label: 'Manager' },
              { value: 'staff', label: 'Staff / Cashier' },
            ]}
          />
          <Select
            label="Status"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={!!passwordTarget}
        onClose={() => setPasswordTarget(null)}
        title="Change Password"
        description={passwordTarget?.email}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPasswordTarget(null)}>Cancel</Button>
            <Button onClick={changePassword} loading={changingPassword}>Change password</Button>
          </>
        }
      >
        <form onSubmit={changePassword} className="space-y-4">
          <Input label="Current password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input label="New password (min 6 chars)" type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={toggleDeactivate}
        title={deactivateTarget?.status === 'active' ? 'Deactivate user' : 'Reactivate user'}
        message={
          deactivateTarget?.status === 'active'
            ? `Deactivate ${deactivateTarget?.name}? They will lose access immediately.`
            : `Reactivate ${deactivateTarget?.name}?`
        }
        confirmLabel={deactivateTarget?.status === 'active' ? 'Deactivate' : 'Reactivate'}
      />
    </AppLayout>
  );
}
