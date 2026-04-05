import { Navigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Supabase est en train de vérifier le token stocké — on attend sans rediriger
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--felt)', color: 'var(--text-muted)' }}
      >
        <div className="text-center space-y-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(201,160,48,0.1)', border: '1px solid rgba(201,160,48,0.25)' }}
          >
            <span style={{ color: 'var(--gold-bright)', fontSize: '1.1rem' }}>♠</span>
          </div>
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  // Pas de session → redirection vers la page de connexion
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
