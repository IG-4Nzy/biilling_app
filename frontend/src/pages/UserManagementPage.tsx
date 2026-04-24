import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Loader2, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@billing/shared';
import { userService } from '../services/api';
import { formatDateTime, getRoleClass } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => userService.list({ search: search || undefined, limit: 50 }),
  });

  const users = data?.data || [];

  const { register: reg, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'STAFF' },
  });

  const createMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setShowModal(false);
      reset();
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">User Management</h1>
          <p className="text-sm text-surface-400">Manage system users and roles</p>
        </div>
        <button onClick={() => { reset(); setShowModal(true); }} className="btn-primary" id="add-user-btn">
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
            <thead><tr><th>User</th><th>Role</th><th>MFA</th><th>Status</th><th>Last Login</th><th className="text-right">Actions</th></tr></thead>
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
                  <td><span className={`text-xs ${u.mfaEnabled ? 'text-accent-400' : 'text-surface-500'}`}>{u.mfaEnabled ? '✅ Enabled' : 'Disabled'}</span></td>
                  <td><span className={`badge ${u.isActive ? 'badge-paid' : 'badge-cancelled'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-surface-400 text-sm">{formatDateTime(u.lastLogin)}</td>
                  <td className="text-right">
                    <button onClick={() => { if (confirm('Deactivate user?')) deleteMutation.mutate(u.id); }} className="btn-icon">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create user modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">New User</h3>
                <button onClick={() => setShowModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div>
                  <label className="label">Name *</label>
                  <input {...reg('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Full name" />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message as string}</p>}
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input {...reg('email')} className={`input ${errors.email ? 'input-error' : ''}`} placeholder="user@company.com" />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message as string}</p>}
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input type="password" {...reg('password')} className={`input ${errors.password ? 'input-error' : ''}`} placeholder="Min 8 chars, uppercase, number, special" />
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message as string}</p>}
                </div>
                <div>
                  <label className="label">Role *</label>
                  <select {...reg('role')} className="input">
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
