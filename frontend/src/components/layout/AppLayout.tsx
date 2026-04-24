import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '../../stores/uiStore';

export default function AppLayout() {
  const { sidebarCollapsed, isMobile, setIsMobile } = useUIStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  const marginLeft = isMobile ? '0' : sidebarCollapsed ? '72px' : '256px';

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />
      <div className="transition-all duration-300" style={{ marginLeft }}>
        <Header />
        <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
