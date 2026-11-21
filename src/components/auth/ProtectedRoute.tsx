import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children, role }: { children: ReactNode; role?: string }) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role && !hasRole(role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-sm text-[#8b8b8e]">You need the "{role}" role to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
