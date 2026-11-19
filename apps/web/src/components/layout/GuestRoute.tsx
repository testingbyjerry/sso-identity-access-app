import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth.js';
import { PageLoader } from '../ui/loading.js';

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader message="Checking session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
