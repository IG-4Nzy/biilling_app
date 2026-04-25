import { useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Loader2, Shield, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@billing/shared';
import { userService } from '../services/api';
import { formatDateTime, getRoleClass } from '../utils/formatters';
import toast from 'react-hot-toast';

const ALL_PRIVILEGES = [
  { key: 'create_bill', label: 'Create Bill', group: 'Billing' },
  { key: 'view_bill', label: 'View Bill', group: 'Billing' },
  { key: 'edit_bill', label: 'Edit Bill', group: 'Billing' },
  { key: 'cancel_bill', label: 'Cancel Bill', group: 'Billing' },
  { key: 'status_update', label: 'Status Update', group: 'Billing' },
  { key: 'add_products', label: 'Add Products', group: 'Products' },
  { key: 'edit_products', label: 'Edit Products', group: 'Products' },
  { key: 'delete_products', label: 'Delete Products', group: 'Products' },
  { key: 'add_customers', label: 'Add Customers', group: 'Customers' },
  { key: 'edit_customers', label: 'Edit Customers', group: 'Customers' },
  { key: 'view_reports', label: 'View Reports', group: 'Reports' },
  { key: 'view_history', label: 'View History', group: 'Reports' },
  { key: 'manage_users', label: 'Manage Users', group: 'Admin' },
];

const PRIVILEGE_GROUPS = [...new Set(ALL_PRIVILEGES.map(p => p.group))];

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => userService.list({ search: search || undefined, limit: 50 }),
  });

  const users = data?.data || [];

  const { register: reg, handleSubmit, reset, formState: { errors }, watch } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'STAFF' },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => userService.create({ ...data, privileges: selectedPrivileges }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: userService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated');
    },
  });

  const openCreateModal = () => {
    setEditUser(null);
    reset({ name: '', email: '', password: '', role: 'STAFF' });
    setSelectedPrivileges([]);
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setEditUser(user);
    setSelectedPrivileges(Array.isArray(user.privileges) ? user.privileges : []);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditUser(null);
    setSelectedPrivileges([]);
    reset();
  };

  const togglePrivilege = (key: string) => {
    setSelectedPrivileges(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const toggleGroup = (group: string) => {
    const groupKeys = ALL_PRIVILEGES.filter(p => p.group === group).map(p => p.key);
    const allSelected = groupKeys.every(k => selectedPrivileges.includes(k));
    if (allSelected) {
      setSelectedPrivileges(prev => prev.filter(p => !groupKeys.includes(p)));
    } else {
      setSelectedPrivileges(prev => [...new Set([...prev, ...groupKeys])]);
    }
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    updateMutation.mutate({
      id: editUser.id,
      data: { privileges: selectedPrivileges },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">User Management</h1>
          <p className="text-sm text-surface-400">Manage users, roles & privileges</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary" id="add-user-btn">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="input pl-10" placeholder="Search users..." />
        </div>
      </div>

      <div className="glass-card">
        <div className="table-container border-0 rounded-none">
          <table className="table">
            <thead><tr><th>User</th><th>Role</th><th>Privileges</th><th>Status</th><th>Last Login</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton w-20 h-4 rounded" /></td>)}</tr>
              )) : users.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{u.name}</p>
                        <p className="text-xs text-surface-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${getRoleClass(u.role)}`}>{u.role}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {u.role === 'ADMIN' ? (
                        <span className="text-[10px] bg-accent-500/10 text-accent-400 px-1.5 py-0.5 rounded">All Access</span>
                      ) : (Array.isArray(u.privileges) && u.privileges.length > 0) ? (
                        u.privileges.slice(0, 3).map((p: string) => (
                          <span key={p} className="text-[10px] bg-surface-700 text-surface-300 px-1.5 py-0.5 rounded">{p.replace(/_/g, ' ')}</span>
                        ))
                      ) : (
                        <span className="text-[10px] text-surface-600">Role defaults</span>
                      )}
                      {Array.isArray(u.privileges) && u.privileges.length > 3 && (
                        <span className="text-[10px] text-surface-500">+{u.privileges.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td><span className={`badge ${u.isActive ? 'badge-paid' : 'badge-cancelled'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-surface-400 text-sm">{formatDateTime(u.lastLogin)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditModal(u)} className="btn-icon" title="Edit privileges">
                        <Shield className="w-4 h-4 text-navy-400" />
                      </button>
                      <button onClick={() => setDeleteTarget(u.id)} className="btn-icon">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — Create or Edit Privileges */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">{editUser ? `Edit Privileges — ${editUser.name}` : 'New User'}</h3>
                <button onClick={closeModal} className="btn-icon"><X className="w-5 h-5" /></button>
              </div>

              {!editUser ? (
                <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                  <div>
                    <label className="label">Name *</label>
                    <input {...reg('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input {...reg('email')} className={`input ${errors.email ? 'input-error' : ''}`} placeholder="user@company.com" />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input type="password" {...reg('password')} className={`input ${errors.password ? 'input-error' : ''}`} placeholder="Min 8 chars" />
                  </div>
                  <div>
                    <label className="label">Role *</label>
                    <select {...reg('role')} className="input">
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>

                  {/* Privileges for new user */}
                  <div>
                    <label className="label mb-2">Custom Privileges (optional)</label>
                    <p className="text-[10px] text-surface-500 mb-3">Leave empty to use role defaults. Admin always has full access.</p>
                    {PRIVILEGE_GROUPS.map(group => (
                      <div key={group} className="mb-3">
                        <button type="button" onClick={() => toggleGroup(group)}
                          className="text-xs font-semibold text-surface-300 uppercase tracking-wide mb-1 hover:text-white transition-colors">
                          {group}
                        </button>
                        <div className="grid grid-cols-2 gap-1.5">
                          {ALL_PRIVILEGES.filter(p => p.group === group).map(p => (
                            <button key={p.key} type="button" onClick={() => togglePrivilege(p.key)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${
                                selectedPrivileges.includes(p.key)
                                  ? 'bg-navy-500/20 border-navy-500/40 text-navy-400'
                                  : 'bg-surface-800/30 border-surface-700/50 text-surface-400 hover:border-surface-600'
                              }`}>
                              {selectedPrivileges.includes(p.key) && <Check className="w-3 h-3" />}
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                    <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                      {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Edit privileges only */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-surface-800/40 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white">
                      {editUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{editUser.name}</p>
                      <p className="text-xs text-surface-500">{editUser.email} · {editUser.role}</p>
                    </div>
                  </div>

                  {editUser.role === 'ADMIN' ? (
                    <div className="p-4 bg-accent-500/10 rounded-lg border border-accent-500/20 text-sm text-accent-400">
                      Admin users have all privileges by default. No customization needed.
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-surface-500">Select which actions this user can perform:</p>
                      {PRIVILEGE_GROUPS.map(group => (
                        <div key={group} className="mb-2">
                          <button onClick={() => toggleGroup(group)}
                            className="text-xs font-semibold text-surface-300 uppercase tracking-wide mb-1 hover:text-white transition-colors">
                            {group}
                          </button>
                          <div className="grid grid-cols-2 gap-1.5">
                            {ALL_PRIVILEGES.filter(p => p.group === group).map(p => (
                              <button key={p.key} onClick={() => togglePrivilege(p.key)}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${
                                  selectedPrivileges.includes(p.key)
                                    ? 'bg-navy-500/20 border-navy-500/40 text-navy-400'
                                    : 'bg-surface-800/30 border-surface-700/50 text-surface-400 hover:border-surface-600'
                                }`}>
                                {selectedPrivileges.includes(p.key) && <Check className="w-3 h-3" />}
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleSaveEdit} disabled={updateMutation.isPending || editUser.role === 'ADMIN'} className="btn-primary flex-1">
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Privileges'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!deleteTarget}
        title="Deactivate User"
        message="Are you sure you want to deactivate this user? They will no longer be able to log in."
        confirmLabel="Deactivate"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
