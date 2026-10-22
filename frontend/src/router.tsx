import React, { type ReactNode } from 'react';
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';

// Lazy-load page components so each route is code-split
const LoginPage = React.lazy(() => import('./pages/Login'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const InventoryPage = React.lazy(() => import('./pages/Inventory'));
const AnalyticsPage = React.lazy(() => import('./pages/Analytics'));
const ImportPage = React.lazy(() => import('./pages/Import'));
const CameraPage = React.lazy(() => import('./pages/Camera'));
const UsersPage = React.lazy(() => import('./pages/Users'));

// Full-page loading fallback while lazy chunks are fetched
function PageLoader(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        fontFamily: '"Inter", sans-serif',
        fontSize: '1rem',
        color: '#5a5a7a',
      }}
    >
      Loading…
    </div>
  );
}

// Root layout wrapper — AuthProvider is provided by App.tsx higher up
function RootLayout(): React.ReactElement {
  return (
    <React.Suspense fallback={<PageLoader />}>
      <Outlet />
    </React.Suspense>
  );
}

// Guard: requires authentication; redirects to /login if not authenticated
export function ProtectedRoute({ children }: { children: ReactNode }): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Guard: requires ADMIN role; redirects to /login (unauthenticated) or /dashboard (wrong role)
export function AdminRoute({ children }: { children: ReactNode }): React.ReactElement {
  const { isAuthenticated, isLoading, hasRole, isGuest } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole('ADMIN') || isGuest) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ProtectedLayout: auth guard + renders Layout (sidebar + appbar) around child routes
function ProtectedLayout(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedLayout />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'import', element: <ImportPage /> },
          { path: 'camera', element: <CameraPage /> },
          {
            path: 'users',
            element: (
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            ),
          },
        ],
      },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

export default router;
