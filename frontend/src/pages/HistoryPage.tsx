import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Filter, ChevronDown } from 'lucide-react';
import { reportService } from '../services/api';
import { formatDate } from '../utils/formatters';

const ENTITY_COLORS: Record<string, string> = {
  bill: 'bg-navy-500/20 text-navy-400',
  product: 'bg-purple-500/20 text-purple-400',
  customer: 'bg-teal-500/20 text-teal-400',
  user: 'bg-amber-500/20 text-amber-400',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-accent-500/20 text-accent-400',
  UPDATE: 'bg-blue-500/20 text-blue-400',
  DELETE: 'bg-red-500/20 text-red-400',
  LOGIN: 'bg-green-500/20 text-green-400',
  LOGIN_FAILED: 'bg-red-500/20 text-red-400',
  LOGOUT: 'bg-surface-500/20 text-surface-400',
};

function formatChanges(changes: any): string {
  if (!changes) return '—';
  if (typeof changes === 'string') return changes;
  
  const parts: string[] = [];
  if (changes.method) parts.push(changes.method);
  if (changes.path) parts.push(changes.path);
  
  // Show relevant body fields
  if (changes.body) {
    const body = changes.body;
    if (body.status) parts.push(`Status → ${body.status}`);
    if (body.invoiceNumber) parts.push(`Invoice: ${body.invoiceNumber}`);
    if (body.name) parts.push(`Name: ${body.name}`);
    if (body.customerId) parts.push(`Customer updated`);
    if (body.items?.length) parts.push(`${body.items.length} items`);
  }
  
  return parts.join(' · ') || JSON.stringify(changes).slice(0, 100);
}

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entityFilter, actionFilter],
    queryFn: () => reportService.getAuditLogs({
      page, limit,
      entity: entityFilter || undefined,
      action: actionFilter || undefined,
    }),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Client-side search filter on username
  const filtered = search
    ? logs.filter((l: any) =>
        l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.entity?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.entityId?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-navy-500/20 flex items-center justify-center">
          <History className="w-5 h-5 text-navy-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Activity History</h1>
          <p className="text-sm text-surface-400">{pagination.total} total actions tracked</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              className="input pl-10" placeholder="Search by user, entity..." />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-surface-500" />
            <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="input py-2 text-sm w-32">
              <option value="">All Entities</option>
              <option value="bill">Bills</option>
              <option value="product">Products</option>
              <option value="customer">Customers</option>
              <option value="user">Users</option>
            </select>
            <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="input py-2 text-sm w-32">
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card">
        <div className="divide-y divide-surface-800/60">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 flex items-start gap-4">
                <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton w-48 h-4 rounded" />
                  <div className="skeleton w-72 h-3 rounded" />
                </div>
              </div>
            ))
          ) : filtered.length ? (
            filtered.map((log: any) => (
              <div key={log.id} className="p-4 hover:bg-surface-800/30 transition-colors">
                <div className="flex items-start gap-4">
                  {/* User avatar */}
                  <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {log.user?.name?.slice(0, 2).toUpperCase() || '??'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{log.user?.name || 'Unknown'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${ACTION_COLORS[log.action] || 'bg-surface-700 text-surface-400'}`}>
                        {log.action}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${ENTITY_COLORS[log.entity] || 'bg-surface-700 text-surface-400'}`}>
                        {log.entity}
                      </span>
                      {log.entityId && (
                        <span className="text-[10px] font-mono text-surface-500">{log.entityId.slice(0, 8)}...</span>
                      )}
                    </div>

                    <p className="text-xs text-surface-400 mt-1 truncate">
                      {formatChanges(log.changes)}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-surface-400">{formatDate(log.timestamp)}</p>
                    <p className="text-[10px] text-surface-600">{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-500">No activity logs found</p>
            </div>
          )}
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
    </div>
  );
}
