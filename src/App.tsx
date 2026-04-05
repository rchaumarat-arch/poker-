import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { AppProvider } from './store/AppContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Route publique — pas de Layout, pas de ProtectedRoute */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Routes protégées — wrappées dans Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/groups/:groupId" element={<GroupPage />} />
                      <Route path="/games/:gameId" element={<GamePage />} />
                    </Routes>
                  </Layout>
                </AppProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
