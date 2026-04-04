import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
              <span className="text-emerald-400 text-base leading-none">♠</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight">Poker Tracker</span>
          </Link>
          {!isHome && (
            <div className="flex-1 flex items-center">
              <div className="w-px h-5 bg-slate-700 mx-1" />
            </div>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
