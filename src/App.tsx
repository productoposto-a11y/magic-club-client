import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './core/auth/AuthContext';
import LoginScreen from './features/auth/LoginScreen';
import StoreLoginScreen from './features/auth/StoreLoginScreen';
import PasswordResetScreen from './features/auth/PasswordResetScreen';

// Skeleton Loader shown while checking auth session
const GlobalLoader = () => (
  <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
    <div className="page-header">
      <div className="skeleton skeleton-heading" style={{ width: '140px' }}></div>
      <div className="skeleton skeleton-btn" style={{ width: '70px' }}></div>
    </div>
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div className="skeleton" style={{ flex: 1, height: '44px' }}></div>
        <div className="skeleton" style={{ flex: 1, height: '44px' }}></div>
        <div className="skeleton" style={{ flex: 1, height: '44px' }}></div>
      </div>
    </div>
    <div className="card">
      <div className="skeleton skeleton-heading" style={{ width: '40%', marginBottom: '1.5rem' }}></div>
      {[1,2,3].map(i => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton-text" style={{ flex: 2 }}></div>
          <div className="skeleton skeleton-text" style={{ flex: 1 }}></div>
          <div className="skeleton skeleton-text" style={{ flex: 1 }}></div>
        </div>
      ))}
    </div>
  </div>
);

// PrivateRoute wrapper ensures users have the correct role before accessing screens
const PrivateRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <GlobalLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children;
};

import ClientDashboard from './features/client/ClientDashboard';
import StorePos from './features/store/StorePos';
import AdminPanel from './features/admin/AdminPanel';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <GlobalLoader />;
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/login/sucursal" element={<StoreLoginScreen />} />
            <Route path="/recuperar" element={<PasswordResetScreen />} />
            <Route path="/unauthorized" element={
              <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2>No tienes permiso para ver esta página.</h2>
              </div>
            } />

            {/* Client App */}
            <Route
              path="/client"
              element={
                <PrivateRoute allowedRoles={['client', 'admin']}>
                  <ClientDashboard />
                </PrivateRoute>
              }
            />

            {/* Store App */}
            <Route
              path="/store"
              element={
                <PrivateRoute allowedRoles={['store_cashier', 'admin']}>
                  <StorePos />
                </PrivateRoute>
              }
            />

            {/* Admin App */}
            <Route
              path="/admin"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </PrivateRoute>
              }
            />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
