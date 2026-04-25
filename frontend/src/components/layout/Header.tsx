import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/bills': 'Billing',
  '/bills/new': 'Create Invoice',
  '/customers': 'Customers',
  '/products': 'Products',
  '/reports': 'Reports',
  '/history': 'History',
  '/settings': 'Settings',
  '/users': 'User Management',
};

export default function Header() {
  const location = useLocation();
  const { toggleSidebar, isMobile } = useUIStore();
  const { user } = useAuthStore();

  const title = pageTitles[location.pathname] || 'ECMF';

  return (
    <header className="no-print sticky top-0 z-30 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <button onClick={toggleSidebar} className="btn-icon">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
        </div>

        {/* Right side — User avatar only */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-surface-500">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
