import { Navigate, useLocation } from 'react-router-dom';
import { canAccessPath, getHomeRoute, getSessionUser } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const session = getSessionUser();

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessPath(session.role, location.pathname)) {
    return <Navigate to={getHomeRoute(session.role)} replace />;
  }

  // Re-check user status on each guarded route navigation.
  // This prevents blocked/deleted users with stale sessions from staying inside the app.
  try {
    const rawUsers = localStorage.getItem('crm_users');
    if (rawUsers) {
      const users = JSON.parse(rawUsers) as Array<{ id: number; email: string; status?: string; isDeleted?: boolean }>;
      const current = users.find((u) => u.id === session.id || u.email === session.email);
      if (current && (current.status === 'заблокирован' || current.isDeleted)) {
        localStorage.removeItem('crm_user');
        return <Navigate to="/" replace />;
      }
    }
  } catch {
    // ignore parse issues and rely on regular session checks
  }

  return <>{children}</>;
}
