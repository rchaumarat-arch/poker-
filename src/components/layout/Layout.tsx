import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen" style={{ color: 'var(--text-warm)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-lg"
        style={{
          background: 'rgba(3, 10, 7, 0.88)',
          borderBottom: '1px solid rgba(201, 160, 48, 0.18)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:scale-105"
              style={{
                background: 'linear-gradient(145deg, rgba(201,160,48,0.2) 0%, rgba(201,160,48,0.08) 100%)',
                border: '1px solid rgba(201, 160, 48, 0.4)',
                boxShadow: '0 0 12px rgba(201,160,48,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <span style={{ color: 'var(--gold-bright)', fontSize: '1rem', lineHeight: 1 }}>♠</span>
            </div>
            <div>
              <span
                className="font-bold text-sm tracking-tight block"
                style={{ color: 'var(--text-warm)', letterSpacing: '-0.02em' }}
              >
                Poker Tracker
              </span>
              {isHome && (
                <span className="text-xs tracking-widest hidden sm:block" style={{ color: 'var(--gold)', opacity: 0.5, fontSize: '0.65rem' }}>
                  ♠ ♥ ♦ ♣
                </span>
              )}
            </div>
          </Link>

          {/* Right: user + sign out */}
          {user && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="hidden sm:block text-xs truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid rgba(201,160,48,0.18)',
                  background: 'rgba(201,160,48,0.06)',
                }}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>

        {/* Gold accent line at bottom */}
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(201,160,48,0.35) 30%, rgba(201,160,48,0.35) 70%, transparent 100%)',
          }}
        />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
