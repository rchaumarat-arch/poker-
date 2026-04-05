import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ---- Types ----

interface AuthContextValue {
  /** L'utilisateur connecté, null si non connecté */
  user: User | null;
  /** La session Supabase complète (token, expiry…) */
  session: Session | null;
  /** true pendant la vérification initiale du token au démarrage */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
}

// ---- Context ----

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- Provider ----

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // loading = true tant que Supabase n'a pas répondu au démarrage
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Récupérer la session existante au montage (token stocké par Supabase dans localStorage)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 2. Écouter tous les changements de session (login, logout, refresh auto)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // On ne remet pas loading à true ici — les changements suivants sont instantanés
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ---- Actions ----

  const signIn = async (email: string, password: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };

  const signUp = async (email: string, password: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return error;
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---- Hook ----

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return ctx;
}
