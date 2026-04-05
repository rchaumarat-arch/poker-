import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{
        background: 'rgba(5, 16, 13, 0.92)',
        borderColor: 'rgba(201, 144, 48, 0.2)',
      }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-105"
              style={{
                background: 'rgba(201, 144, 48, 0.15)',
                border: '1px solid rgba(201, 144, 48, 0.4)',
                boxShadow: '0 0 12px rgba(201, 144, 48, 0.1)',
              }}
            >
              <span className="text-base leading-none" style={{ color: '#e8b94a' }}>♠</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight">Poker Tracker</span>
          </Link>
          {!isHome && (
            <div className="flex-1 flex items-center">
              <div className="w-px h-5 mx-1" style={{ background: 'rgba(201, 144, 48, 0.2)' }} />
            </div>
          )}
          {isHome && (
            <div className="flex-1 flex items-center justify-end gap-3">
              <span className="text-xs tracking-widest opacity-30 select-none hidden sm:block" style={{ color: '#e8b94a' }}>
                ♠ ♥ ♦ ♣
              </span>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
