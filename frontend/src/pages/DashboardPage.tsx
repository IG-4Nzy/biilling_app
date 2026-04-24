import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, IndianRupee, FileText, Users, Package,
  AlertCircle, ArrowUpRight, ArrowDownRight, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { dashboardService } from '../services/api';
import { formatCurrency, formatDate, getStatusClass } from '../utils/formatters';

function StatCard({ title, value, icon: Icon, trend, color, delay = 0 }: {
  title: string; value: string; icon: any;
  trend?: { value: number; label: string };
  color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      className="stat-card group hover:border-surface-600 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            trend.value >= 0 ? 'text-accent-400' : 'text-red-400'
          }`}>
            {trend.value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-surface-400 mt-0.5">{title}</p>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getStats,
    refetchInterval: 60000, // Auto-refresh every minute
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="mt-3 space-y-2">
                <div className="skeleton w-24 h-7 rounded" />
                <div className="skeleton w-16 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="glass-card p-6">
          <div className="skeleton w-full h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 glass-card text-red-400">
        <AlertCircle className="w-5 h-5" />
        <p>Failed to load dashboard data. Please try again.</p>
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 !border-surface-600 text-sm">
        <p className="text-surface-400 mb-1">{label}</p>
        <p className="text-white font-semibold">{formatCurrency(payload[0].value)}</p>
        <p className="text-surface-400 text-xs">{payload[0].payload.count} bills</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Revenue stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats?.todayRevenue || 0)}
          icon={IndianRupee}
          color="from-accent-600 to-accent-700"
          delay={0}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthRevenue || 0)}
          icon={TrendingUp}
          color="from-navy-500 to-navy-600"
          delay={1}
        />
        <StatCard
          title="Pending Amount"
          value={formatCurrency(stats?.pendingAmount || 0)}
          icon={Clock}
          color="from-amber-500 to-amber-600"
          delay={2}
        />
        <StatCard
          title="Today's Bills"
          value={String(stats?.todayBills || 0)}
          icon={FileText}
          color="from-purple-500 to-purple-600"
          delay={3}
        />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-navy-400" />
          <div>
            <p className="text-lg font-bold text-white">{stats?.totalCustomers || 0}</p>
            <p className="text-xs text-surface-400">Active Customers</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <Package className="w-5 h-5 text-accent-400" />
          <div>
            <p className="text-lg font-bold text-white">{stats?.totalProducts || 0}</p>
            <p className="text-xs text-surface-400">Active Products</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <IndianRupee className="w-5 h-5 text-purple-400" />
          <div>
            <p className="text-lg font-bold text-white">{formatCurrency(stats?.weekRevenue || 0)}</p>
            <p className="text-xs text-surface-400">This Week</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-lg font-bold text-white">{formatCurrency(stats?.yearRevenue || 0)}</p>
            <p className="text-xs text-surface-400">This Year</p>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales trend chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <h3 className="text-base font-semibold text-white mb-4">Sales Trend (30 Days)</h3>
          {stats?.salesTrend?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.salesTrend}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#416cf0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#416cf0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                />
                <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip content={customTooltip} />
                <Area type="monotone" dataKey="amount" stroke="#416cf0" strokeWidth={2}
                  fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-surface-500">
              <p>No sales data yet</p>
            </div>
          )}
        </motion.div>

        {/* Top products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4">Top Products</h3>
          {stats?.topProducts?.length ? (
            <div className="space-y-3">
              {stats.topProducts.map((product: any, i: number) => (
                <div key={product.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-800/40 transition-colors">
                  <span className="w-6 h-6 rounded-full bg-navy-500/20 text-navy-400 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{product.productName}</p>
                    <p className="text-xs text-surface-500">{product.totalQuantity} sold</p>
                  </div>
                  <p className="text-sm font-semibold text-accent-400">{formatCurrency(product.totalRevenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-surface-500">
              <p>No product data yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent bills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card"
      >
        <div className="p-6 border-b border-surface-800">
          <h3 className="text-base font-semibold text-white">Recent Invoices</h3>
        </div>
        <div className="table-container border-0 rounded-none">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentBills?.length ? stats.recentBills.map((bill: any) => (
                <tr key={bill.id}>
                  <td className="font-mono text-xs text-navy-400">{bill.invoiceNumber}</td>
                  <td className="text-white font-medium">{bill.customer?.name}</td>
                  <td>
                    <span className={`badge ${getStatusClass(bill.status)}`}>{bill.status}</span>
                  </td>
                  <td className="font-semibold text-white">{formatCurrency(bill.grandTotal)}</td>
                  <td className="text-surface-400">{formatDate(bill.createdAt)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center text-surface-500 py-8">No bills yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
