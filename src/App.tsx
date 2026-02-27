import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './core/auth/AuthContext';
import LoginScreen from './features/auth/LoginScreen';
import MagicLinkCallback from './features/auth/MagicLinkCallback';

// Simple Loader Component
const GlobalLoader = () => (
  <div className="loader-container">
    <div className="spinner"></div>
    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Cargando Magic Club...</p>
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
        {/* We can add a global Navbar here later if needed */}
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/auth/callback" element={<MagicLinkCallback />} />
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
