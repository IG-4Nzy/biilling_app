import { useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Loader2, Users as UsersIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerCreateSchema, INDIAN_STATES } from '@billing/shared';
import { customerService } from '../services/api';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customerService.list({ page, limit: 25, search: search || undefined }),
  });

  const customers = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(customerCreateSchema),
  });

  const watchStateCode = watch('stateCode');

  const createMutation = useMutation({
    mutationFn: (data: any) => editId ? customerService.update(editId, data) : customerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(editId ? 'Customer updated' : 'Customer created');
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save customer'),
  });

  const deleteMutation = useMutation({
    mutationFn: customerService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
    },
  });

  const openModal = (customer?: any) => {
    if (customer) {
      setEditId(customer.id);
      reset({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        gstin: customer.gstin || '',
        state: customer.state || '',
        stateCode: customer.stateCode || '',
      });
    } else {
      setEditId(null);
      reset({ name: '', email: '', phone: '', address: '', gstin: '', state: '', stateCode: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditId(null); reset(); };

  const handleStateChange = (code: string) => {
    setValue('stateCode', code);
    const found = INDIAN_STATES.find(s => s.code === code);
    if (found) {
      setValue('state', found.name);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Customers</h1>
          <p className="text-sm text-surface-400">{pagination.total} total customers</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary" id="add-customer-btn">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10" placeholder="Search customers..."
          />
        </div>
      </div>

      <div className="glass-card">
        <div className="table-container border-0 rounded-none">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>GSTIN</th>
                <th>State</th>
                <th>Phone</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton w-20 h-4 rounded" /></td>)}</tr>
              )) : customers.length ? customers.map((c: any) => (
                <tr key={c.id}>
                  <td className="text-white font-medium">{c.name}</td>
                  <td className="text-surface-400 text-xs max-w-[200px] truncate">{c.address || '—'}</td>
                  <td className="font-mono text-xs text-surface-400">{c.gstin || '—'}</td>
                  <td className="text-surface-400 text-xs">
                    {c.state ? `${c.state} (${c.stateCode})` : '—'}
                  </td>
                  <td className="text-surface-400">{c.phone || '—'}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openModal(c)} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(c.id)} className="btn-icon">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center py-12">
                  <UsersIcon className="w-12 h-12 text-surface-700 mx-auto mb-3" />
                  <p className="text-surface-500">No customers yet</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">{editId ? 'Edit Customer' : 'New Customer'}</h3>
                <button onClick={closeModal} className="btn-icon"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div>
                  <label className="label">Name *</label>
                  <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Customer / Company name" />
                  {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message as string}</p>}
                </div>
                <div>
                  <label className="label">Address</label>
                  <input {...register('address')} className="input" placeholder="Full address" />
                </div>
                <div>
                  <label className="label">GSTIN</label>
                  <input {...register('gstin')} className="input font-mono" placeholder="32AABCK2217K1ZW" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">State</label>
                    <select
                      value={watchStateCode || ''}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="input"
                    >
                      <option value="">-- Select State --</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">State Code</label>
                    <input
                      value={watchStateCode || ''}
                      readOnly
                      className="input bg-surface-900 text-surface-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Email</label>
                    <input {...register('email')} className="input" placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input {...register('phone')} className="input" placeholder="9876543210" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Customer"
        message="Are you sure you want to delete this customer?"
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
