import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Users, Package, BarChart3,
  Settings, Shield, LogOut, Menu, X, ChevronLeft, Zap, History,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { authService } from '../../services/api';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/bills', label: 'Billing', icon: FileText },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { path: '/users', label: 'User Management', icon: Shield },
];

export default function Sidebar() {
  const { user, refreshToken, logout: authLogout } = useAuthStore();
  const { sidebarOpen, sidebarCollapsed, isMobile, setSidebarOpen, toggleCollapse } = useUIStore();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } catch {}
    authLogout();
  };

  const allItems = user?.role === 'ADMIN' ? [...navItems, ...adminItems] : navItems;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-surface-800">
        <div className="w-9 h-9 bg-gradient-to-br from-navy-500 to-accent-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
            <h1 className="text-lg font-bold text-white tracking-tight">BillForge</h1>
            <p className="text-[10px] text-surface-500 uppercase tracking-widest">Enterprise</p>
          </motion.div>
        )}
        {!isMobile && (
          <button onClick={toggleCollapse} className="ml-auto btn-icon hidden lg:flex">
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => isMobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
              ${isActive
                ? 'bg-navy-500/15 text-navy-400 border border-navy-500/20'
                : 'text-surface-400 hover:text-white hover:bg-surface-800/60'
              }
              ${sidebarCollapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-surface-800">
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-surface-500 truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`no-print fixed top-0 left-0 h-full bg-surface-900/95 backdrop-blur-xl border-r border-surface-800 z-50 transition-all duration-300
          ${isMobile
            ? sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
            : sidebarCollapsed ? 'w-[72px]' : 'w-64'
          }
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
