import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const error = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Connexion réussie → AppProvider s'initialise avec les données de cet utilisateur
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
        <form
          onSubmit={handleSubmit}
          className="card space-y-4 p-6"
        >
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

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
          >
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
