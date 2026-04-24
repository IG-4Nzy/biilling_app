import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useState, useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for zustand persist to finish hydrating from localStorage
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // If already hydrated
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return () => unsub();
  }, []);

  // Show nothing while hydrating to prevent flash redirect to login
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-950">
        <div className="animate-spin w-8 h-8 border-2 border-navy-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
