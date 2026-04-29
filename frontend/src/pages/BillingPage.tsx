import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, FileText, Eye, Edit2, CheckCircle, XCircle, AlertTriangle, Lock, X } from 'lucide-react';
import { billService, companyService } from '../services/api';
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
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(1);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string; label: string } | null>(null);

  // PIN modal state
  const [pinModal, setPinModal] = useState<{ billId: string } | null>(null);
  const [pinInput, setPinInput] = useState('');

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: companyService.get, staleTime: 5 * 60 * 1000 });

  const handlePreviewClick = (billId: string) => {
    if (company?.previewPin) {
      setPinModal({ billId });
      setPinInput('');
    } else {
      navigate(`/bills/${billId}`);
    }
  };

  const handlePinSubmit = () => {
    if (pinInput === company?.previewPin) {
      navigate(`/bills/${pinModal!.billId}`);
      setPinModal(null);
    } else {
      toast.error('Incorrect PIN');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['bills', page, search, statusFilter, monthFilter],
    queryFn: () => billService.list({
      page, limit: 25,
      search: search || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      month: monthFilter || undefined,
    }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => billService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status updated');
      setConfirmAction(null);
    },
    onError: (err: any) => { toast.error(err.response?.data?.error || 'Failed'); setConfirmAction(null); },
  });

  const bills = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const canEdit = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const askConfirm = (id: string, status: string, label: string) => setConfirmAction({ id, status, label });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-surface-400">{pagination.total} total</p>
        </div>
        {canEdit && (
          <Link to="/bills/new" className="btn-primary"><Plus className="w-4 h-4" /> New Invoice</Link>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10" placeholder="Search invoice or customer..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="month" value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
              className="input py-2 text-sm w-44" />
            {monthFilter && (
              <button onClick={() => { setMonthFilter(''); setPage(1); }}
                className="text-xs text-surface-400 hover:text-white transition-colors">Clear</button>
            )}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {statusFilters.map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === s ? 'bg-navy-500/20 text-navy-400 border border-navy-500/30' : 'text-surface-400 hover:bg-surface-800 hover:text-white'
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card">
        <div className="table-container border-0 rounded-none overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Created By</th>
                <th>Updated By</th>
                {canEdit && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: canEdit ? 8 : 7 }).map((_, j) => <td key={j}><div className="skeleton w-16 h-4 rounded" /></td>)}</tr>
                ))
              ) : bills.length ? (
                bills.map((bill: any) => (
                  <tr key={bill.id}>
                    <td className="font-mono text-xs text-navy-400 font-medium cursor-pointer hover:text-navy-300"
                      onClick={() => navigate(`/bills/${bill.id}`)}>{bill.invoiceNumber}</td>
                    <td className="text-white font-medium text-sm">{bill.customer?.name}</td>
                    <td><span className={`badge ${getStatusClass(bill.status)}`}>{bill.status}</span></td>
                    <td className="font-semibold text-white">{formatCurrency(bill.grandTotal)}</td>
                    <td className="text-surface-400 text-xs">{formatDate(bill.createdAt)}</td>
                    <td className="text-surface-400 text-xs">{bill.creator?.name || '—'}</td>
                    <td className="text-surface-400 text-xs">
                      {bill.updater?.name || '—'}
                      {bill.updatedAt && <span className="block text-[10px] text-surface-600">{formatDate(bill.updatedAt)}</span>}
                    </td>
                    {canEdit && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handlePreviewClick(bill.id)} className="btn-icon" title="View">
                            <Eye className="w-4 h-4 text-surface-400" />
                          </button>
                          {bill.status !== 'CANCELLED' && (
                            <button onClick={() => navigate(`/bills/${bill.id}/edit`)} className="btn-icon" title="Edit">
                              <Edit2 className="w-4 h-4 text-navy-400" />
                            </button>
                          )}
                          {bill.status === 'DRAFT' && (
                            <button onClick={() => askConfirm(bill.id, 'UNPAID', 'Mark as Unpaid')} className="btn-icon" title="Mark Unpaid">
                              <AlertTriangle className="w-4 h-4 text-orange-400" />
                            </button>
                          )}
                          {bill.status === 'UNPAID' && (
                            <button onClick={() => askConfirm(bill.id, 'PAID', 'Mark as Paid')} className="btn-icon" title="Mark Paid">
                              <CheckCircle className="w-4 h-4 text-accent-400" />
                            </button>
                          )}
                          {!['PAID', 'CANCELLED'].includes(bill.status) && (
                            <button onClick={(e) => { e.stopPropagation(); askConfirm(bill.id, 'CANCELLED', 'Cancel Invoice'); }}
                              className="btn-icon" title="Cancel">
                              <XCircle className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={canEdit ? 8 : 7} className="text-center py-12">
                  <FileText className="w-12 h-12 text-surface-700 mx-auto mb-3" />
                  <p className="text-surface-500">{statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} invoices` : 'No invoices found'}</p>
                  {canEdit && statusFilter === 'ALL' && <Link to="/bills/new" className="btn-primary mt-3 inline-flex"><Plus className="w-4 h-4" /> Create First Invoice</Link>}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-surface-800">
            <p className="text-sm text-surface-400">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-sm py-1.5 px-3">Previous</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="btn-secondary text-sm py-1.5 px-3">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Confirmation Modal for ALL status changes ─── */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmAction(null)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">{confirmAction.label}?</h3>
            <p className="text-sm text-surface-400 mb-6">
              {confirmAction.status === 'CANCELLED'
                ? 'Are you sure? This action cannot be undone.'
                : `Change status to "${confirmAction.status}"?`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => statusMutation.mutate({ id: confirmAction.id, status: confirmAction.status })}
                disabled={statusMutation.isPending}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  confirmAction.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : confirmAction.status === 'PAID' ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30 hover:bg-accent-500/30'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                }`}>
                {statusMutation.isPending ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PIN Modal ─── */}
      <AnimatePresence>
        {pinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setPinModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-navy-400" />
                  <h3 className="text-base font-semibold text-white">Enter PIN</h3>
                </div>
                <button onClick={() => setPinModal(null)} className="btn-icon"><X className="w-4 h-4" /></button>
              </div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                className="input text-center text-lg tracking-[0.5em] font-mono mb-4"
                placeholder="••••"
                autoFocus
                autoComplete="new-password"
                maxLength={10}
              />
              <div className="flex gap-3">
                <button onClick={() => setPinModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handlePinSubmit} className="btn-primary flex-1">Verify</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
