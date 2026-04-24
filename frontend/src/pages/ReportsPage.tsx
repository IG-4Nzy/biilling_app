import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, Calendar, BarChart3, TrendingUp, Users, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { reportService } from '../services/api';
import { formatCurrency, downloadBlob } from '../utils/formatters';
import toast from 'react-hot-toast';

const COLORS = ['#416cf0', '#14b880', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales' | 'customers' | 'products'>('sales');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: salesData } = useQuery({
    queryKey: ['reports', 'sales', startDate, endDate],
    queryFn: () => reportService.getSales({ startDate, endDate }),
    enabled: tab === 'sales',
  });

  const { data: customerData } = useQuery({
    queryKey: ['reports', 'customers', startDate, endDate],
    queryFn: () => reportService.getCustomerSpending({ startDate, endDate }),
    enabled: tab === 'customers',
  });

  const { data: productData } = useQuery({
    queryKey: ['reports', 'products', startDate, endDate],
    queryFn: () => reportService.getTopProducts({ startDate, endDate }),
    enabled: tab === 'products',
  });

  const handleExport = async () => {
    try {
      const blob = await reportService.exportCSV({ startDate, endDate, type: 'bills' });
      downloadBlob(blob, `bills-${startDate}-${endDate}.csv`);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 !border-surface-600 text-sm">
        <p className="text-surface-400 mb-1">{label}</p>
        <p className="text-white font-semibold">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
        <button onClick={handleExport} className="btn-secondary">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Date range + tabs */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-surface-500" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input py-2 w-40" />
            <span className="text-surface-500">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input py-2 w-40" />
          </div>
          <div className="flex gap-1 ml-auto">
            {[
              { key: 'sales', label: 'Sales', icon: TrendingUp },
              { key: 'customers', label: 'Customers', icon: Users },
              { key: 'products', label: 'Products', icon: Package },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === key ? 'bg-navy-500/20 text-navy-400 border border-navy-500/30' : 'text-surface-400 hover:bg-surface-800'
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sales tab */}
      {tab === 'sales' && (
        <div className="space-y-6">
          {salesData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="stat-card">
                <p className="text-xs text-surface-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(salesData.summary.totalRevenue)}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-surface-400">Total Bills</p>
                <p className="text-2xl font-bold text-white">{salesData.summary.totalBills}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-surface-400">Average Bill Value</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(salesData.summary.averageBillValue)}</p>
              </div>
            </div>
          )}
          <div className="glass-card p-6">
            <h3 className="text-base font-semibold text-white mb-4">Revenue Trend</h3>
            {salesData?.salesData?.length ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={salesData.salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="period" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="total_revenue" fill="#416cf0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-64 flex items-center justify-center text-surface-500">No data for this period</div>}
          </div>
        </div>
      )}

      {/* Customers tab */}
      {tab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-base font-semibold text-white mb-4">Top Customers by Spending</h3>
            {customerData?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={customerData.slice(0, 6)} dataKey="totalSpent" nameKey="customerName" cx="50%" cy="50%"
                    outerRadius={100} innerRadius={50} label={({ name }) => name?.slice(0, 12)}>
                    {customerData.slice(0, 6).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-64 flex items-center justify-center text-surface-500">No data</div>}
          </div>
          <div className="glass-card">
            <div className="p-4 border-b border-surface-800"><h3 className="text-base font-semibold text-white">Customer Rankings</h3></div>
            <div className="divide-y divide-surface-800">
              {customerData?.map((c: any, i: number) => (
                <div key={c.customerId} className="flex items-center gap-3 p-4 hover:bg-surface-800/40 transition-colors">
                  <span className="w-6 h-6 rounded-full bg-navy-500/20 text-navy-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1"><p className="text-sm font-medium text-white">{c.customerName}</p><p className="text-xs text-surface-500">{c.billCount} bills</p></div>
                  <p className="text-sm font-semibold text-accent-400">{formatCurrency(c.totalSpent)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products tab */}
      {tab === 'products' && (
        <div className="glass-card">
          <div className="p-4 border-b border-surface-800"><h3 className="text-base font-semibold text-white">Product Performance</h3></div>
          <div className="table-container border-0 rounded-none">
            <table className="table">
              <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Qty Sold</th><th>Orders</th><th className="text-right">Revenue</th></tr></thead>
              <tbody>
                {productData?.map((p: any, i: number) => (
                  <tr key={p.productId}>
                    <td className="text-surface-500 font-medium">{i + 1}</td>
                    <td className="text-white font-medium">{p.productName}</td>
                    <td className="font-mono text-xs text-surface-400">{p.sku}</td>
                    <td className="text-surface-300">{p.totalQuantity}</td>
                    <td className="text-surface-300">{p.orderCount}</td>
                    <td className="text-right font-semibold text-accent-400">{formatCurrency(p.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
