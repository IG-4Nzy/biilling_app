import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Loader2, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productCreateSchema } from '@billing/shared';
import { productService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => productService.list({ page, limit: 25, search: search || undefined }),
  });

  const products = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(productCreateSchema),
    defaultValues: { unit: 'PCS', taxRate: 18, stock: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => editId ? productService.update(editId, data) : productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(editId ? 'Product updated' : 'Product created');
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
  });

  const openModal = (product?: any) => {
    if (product) {
      setEditId(product.id);
      reset({
        name: product.name, description: product.description || '', sku: product.sku,
        hsnCode: product.hsnCode || '',
        unitPrice: product.unitPrice, taxRate: product.taxRate, unit: product.unit,
        stock: product.stock, category: product.category || '',
      });
    } else {
      setEditId(null);
      reset({ name: '', sku: '', hsnCode: '', unitPrice: 0, taxRate: 18, unit: 'PCS', stock: 0 });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditId(null); reset(); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Products & Services</h1>
          <p className="text-sm text-surface-400">{pagination.total} total items</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary" id="add-product-btn">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10" placeholder="Search products..."
          />
        </div>
      </div>

      <div className="glass-card">
        <div className="table-container border-0 rounded-none">
          <table className="table">
            <thead><tr><th>Product</th><th>SKU</th><th>HSN</th><th>Price</th><th>Tax</th><th>Stock</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="skeleton w-20 h-4 rounded" /></td>)}</tr>
              )) : products.length ? products.map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <p className="text-white font-medium">{p.name}</p>
                      {p.description && <p className="text-xs text-surface-500 truncate max-w-[200px]">{p.description}</p>}
                    </div>
                  </td>
                  <td className="font-mono text-xs text-surface-400">{p.sku}</td>
                  <td className="font-mono text-xs text-surface-400">{p.hsnCode || '—'}</td>
                  <td className="text-white font-semibold">{formatCurrency(p.unitPrice)}</td>
                  <td className="text-surface-400">{p.taxRate}%</td>
                  <td>
                    <span className={`font-medium ${p.stock < 10 ? 'text-red-400' : p.stock < 50 ? 'text-amber-400' : 'text-accent-400'}`}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openModal(p)} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(p.id); }} className="btn-icon">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center py-12">
                  <Package className="w-12 h-12 text-surface-700 mx-auto mb-3" />
                  <p className="text-surface-500">No products yet</p>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">{editId ? 'Edit Product' : 'New Product'}</h3>
                <button onClick={closeModal} className="btn-icon"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div>
                  <label className="label">Name *</label>
                  <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Product name" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input {...register('description')} className="input" placeholder="Brief description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">SKU *</label>
                    <input {...register('sku')} className={`input font-mono ${errors.sku ? 'input-error' : ''}`} placeholder="PRD-001" />
                  </div>
                  <div>
                    <label className="label">HSN/SAC Code</label>
                    <input {...register('hsnCode')} className="input font-mono" placeholder="8401" />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <input {...register('category')} className="input" placeholder="e.g. Services" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Price (₹) *</label>
                    <input type="number" {...register('unitPrice', { valueAsNumber: true })} className="input" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="label">Tax Rate % *</label>
                    <input type="number" {...register('taxRate', { valueAsNumber: true })} className="input" min="0" max="100" />
                  </div>
                  <div>
                    <label className="label">Stock *</label>
                    <input type="number" {...register('stock', { valueAsNumber: true })} className="input" min="0" />
                  </div>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select {...register('unit')} className="input">
                    {['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'SET', 'HOUR', 'SERVICE'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
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
    </div>
  );
}
