import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Supabase vérifie le token en cours — même écran d'attente que ProtectedRoute
  // pour éviter un flash du formulaire avant la décision
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

  // Utilisateur déjà connecté → pas besoin du formulaire
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const error = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // onAuthStateChange dans AuthContext mettra user à jour ;
    // navigate déclenche le rendu de ProtectedRoute qui laisse passer l'utilisateur
    navigate('/');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--felt)' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'rgba(201,160,48,0.12)',
              border: '1px solid rgba(201,160,48,0.35)',
              boxShadow: '0 0 24px rgba(201,160,48,0.1)',
            }}
          >
            <span style={{ fontSize: '1.75rem', color: 'var(--gold-bright)' }}>♠</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-warm)' }}>
            Poker Tracker
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Connectez-vous à votre compte' : 'Créer un compte'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            autoFocus
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••'}
            required
          />

          {errorMsg && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </Button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          {mode === 'login' ? "Pas encore de compte ?" : 'Déjà un compte ?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrorMsg(''); }}
            className="font-medium underline transition-colors hover:opacity-80"
            style={{ color: 'var(--gold-bright)' }}
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>

      </div>
    </div>
  );
}
