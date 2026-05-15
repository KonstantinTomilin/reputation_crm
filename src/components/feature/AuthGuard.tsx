import { Navigate } from 'react-router-dom';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = localStorage.getItem('crm_user');
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}