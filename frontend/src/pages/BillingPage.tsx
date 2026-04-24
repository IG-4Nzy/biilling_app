import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Eye, Edit2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { billService } from '../services/api';
import { formatCurrency, formatDate, getStatusClass } from '../utils/formatters';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const statusFilters = ['ALL', 'DRAFT', 'UNPAID', 'PAID', 'CANCELLED'];

export default function BillingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', page, search, statusFilter],
    queryFn: () => billService.list({
      page,
      limit: 25,
      search: search || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => billService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Bill status updated');
      setCancelId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update status');
      setCancelId(null);
    },
  });

  const bills = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const canEdit = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-surface-400">{pagination.total} total bills</p>
        </div>
        {canEdit && (
          <Link to="/bills/new" className="btn-primary" id="create-bill-btn">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10" placeholder="Search by invoice number or customer..." id="bill-search" />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {statusFilters.map((status) => (
              <button key={status}
                onClick={() => { setStatusFilter(status); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-navy-500/20 text-navy-400 border border-navy-500/30'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-white'
                }`}>
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card">
        <div className="table-container border-0 rounded-none">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Created By</th>
                <th>Updated</th>
                {canEdit && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: canEdit ? 8 : 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton w-16 h-4 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : bills.length ? (
                bills.map((bill: any) => (
                  <tr key={bill.id}>
                    <td className="font-mono text-xs text-navy-400 font-medium cursor-pointer hover:text-navy-300"
                      onClick={() => navigate(`/bills/${bill.id}`)}>
                      {bill.invoiceNumber}
                    </td>
                    <td className="text-white font-medium">{bill.customer?.name}</td>
                    <td><span className={`badge ${getStatusClass(bill.status)}`}>{bill.status}</span></td>
                    <td className="font-semibold text-white">{formatCurrency(bill.grandTotal)}</td>
                    <td className="text-surface-400 text-xs">{formatDate(bill.createdAt)}</td>
                    <td className="text-surface-400 text-xs">{bill.creator?.name || '—'}</td>
                    <td className="text-surface-400 text-xs">{formatDate(bill.updatedAt)}</td>
                    {canEdit && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/bills/${bill.id}`)}
                            className="btn-icon" title="View Invoice">
                            <Eye className="w-4 h-4 text-surface-400" />
                          </button>
                          {bill.status !== 'CANCELLED' && (
                            <button onClick={() => navigate(`/bills/${bill.id}/edit`)}
                              className="btn-icon" title="Edit">
                              <Edit2 className="w-4 h-4 text-navy-400" />
                            </button>
                          )}
                          {bill.status === 'DRAFT' && (
                            <button onClick={() => statusMutation.mutate({ id: bill.id, status: 'UNPAID' })}
                              className="btn-icon" title="Mark as Unpaid">
                              <AlertTriangle className="w-4 h-4 text-orange-400" />
                            </button>
                          )}
                          {bill.status === 'UNPAID' && (
                            <button onClick={() => statusMutation.mutate({ id: bill.id, status: 'PAID' })}
                              className="btn-icon" title="Mark Paid">
                              <CheckCircle className="w-4 h-4 text-accent-400" />
                            </button>
                          )}
                          {!['PAID', 'CANCELLED'].includes(bill.status) && (
                            <button onClick={(e) => { e.stopPropagation(); setCancelId(bill.id); }}
                              className="btn-icon" title="Cancel Bill">
                              <XCircle className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="text-center py-12">
                    <FileText className="w-12 h-12 text-surface-700 mx-auto mb-3" />
                    <p className="text-surface-500">
                      {statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} invoices` : 'No invoices found'}
                    </p>
                    {canEdit && statusFilter === 'ALL' && (
                      <Link to="/bills/new" className="btn-primary mt-3 inline-flex">
                        <Plus className="w-4 h-4" /> Create First Invoice
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-surface-800">
            <p className="text-sm text-surface-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} results)
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="btn-secondary text-sm py-1.5 px-3">Previous</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="btn-secondary text-sm py-1.5 px-3">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Cancel Confirmation Modal ─── */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setCancelId(null)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Cancel Invoice?</h3>
            <p className="text-sm text-surface-400 mb-6">
              Are you sure you want to cancel this invoice? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelId(null)} className="btn-secondary flex-1">
                No, Keep
              </button>
              <button onClick={() => statusMutation.mutate({ id: cancelId, status: 'CANCELLED' })}
                disabled={statusMutation.isPending}
                className="btn-danger flex-1">
                {statusMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
