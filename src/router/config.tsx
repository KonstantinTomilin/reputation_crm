import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import LoginPage from '@/pages/login/page';
import AuthGuard from '@/components/feature/AuthGuard';

// Client
import ClientDashboardPage from '@/pages/client-dashboard/page';
import ClientProjectPage from '@/pages/client-project/page';
import ClientProjectsPage from '@/pages/client-projects/page';
import ClientLinksPage from '@/pages/client-links/page';
import ClientReportsPage from '@/pages/client-reports/page';
import ClientBillingPage from '@/pages/client-billing/page';

// Executor
import ExecutorTasksPage from '@/pages/executor-tasks/page';
import ExecutorProjectPage from '@/pages/executor-project/page';
import ExecutorInProgressPage from '@/pages/executor-in-progress/page';
import ExecutorHistoryPage from '@/pages/executor-history/page';
import ExecutorReportsPage from '@/pages/executor-reports/page';
import ExecutorAuditsPage from '@/pages/executor-audits/page';

// Auditor
import AuditorTasksPage from '@/pages/auditor-tasks/page';
import AuditorActivePage from '@/pages/auditor-active/page';
import AuditorHistoryPage from '@/pages/auditor-history/page';

// Management (unified)
import ManagementDashboardPage from '@/pages/management-dashboard/page';

function WrapAuth({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

const routes: RouteObject[] = [
  // Login
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/crm-login',
    element: <Navigate to="/" replace />,
  },

  // Client
  {
    path: '/client',
    element: <WrapAuth><ClientDashboardPage /></WrapAuth>,
  },
  {
    path: '/client/projects',
    element: <WrapAuth><ClientProjectsPage /></WrapAuth>,
  },
  {
    path: '/client/project/:id',
    element: <WrapAuth><ClientProjectPage /></WrapAuth>,
  },
  {
    path: '/client/links',
    element: <WrapAuth><ClientLinksPage /></WrapAuth>,
  },
  {
    path: '/client/reports',
    element: <WrapAuth><ClientReportsPage /></WrapAuth>,
  },
  {
    path: '/client/billing',
    element: <WrapAuth><ClientBillingPage /></WrapAuth>,
  },

  // Executor
  {
    path: '/executor',
    element: <WrapAuth><ExecutorTasksPage /></WrapAuth>,
  },
  {
    path: '/executor/tasks',
    element: <WrapAuth><ExecutorTasksPage /></WrapAuth>,
  },
  {
    path: '/executor/project/:id',
    element: <WrapAuth><ExecutorProjectPage /></WrapAuth>,
  },
  {
    path: '/executor/in-progress',
    element: <WrapAuth><ExecutorInProgressPage /></WrapAuth>,
  },
  {
    path: '/executor/history',
    element: <WrapAuth><ExecutorHistoryPage /></WrapAuth>,
  },
  {
    path: '/executor/reports',
    element: <WrapAuth><ExecutorReportsPage /></WrapAuth>,
  },
  {
    path: '/executor/audits',
    element: <WrapAuth><ExecutorAuditsPage /></WrapAuth>,
  },

  // Auditor
  {
    path: '/auditor',
    element: <WrapAuth><AuditorTasksPage /></WrapAuth>,
  },
  {
    path: '/auditor/tasks',
    element: <WrapAuth><AuditorTasksPage /></WrapAuth>,
  },
  {
    path: '/auditor/active',
    element: <WrapAuth><AuditorActivePage /></WrapAuth>,
  },
  {
    path: '/auditor/history',
    element: <WrapAuth><AuditorHistoryPage /></WrapAuth>,
  },

  // Management — unified admin + manager + main_admin
  {
    path: '/management',
    element: <WrapAuth><Navigate to="/management/overview" replace /></WrapAuth>,
  },
  {
    path: '/management/:tab',
    element: <WrapAuth><ManagementDashboardPage /></WrapAuth>,
  },

  // Legacy admin pages (redirects)
  {
    path: '/admin',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/admin/*',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/manager',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/main-admin',
    element: <Navigate to="/" replace />,
  },

  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
