import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'rgba(2, 8, 5, 0.82)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative w-full ${sizeClass} rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col`}
        style={{
          background: 'linear-gradient(160deg, #0d2218 0%, #071410 100%)',
          border: '1px solid rgba(201, 160, 48, 0.28)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 80px rgba(0,0,0,0.75), 0 0 40px rgba(201,160,48,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201, 160, 48, 0.14)' }}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--gold-bright)', opacity: 0.6, fontSize: '0.85rem' }}>♠</span>
            <h2 className="text-base font-semibold text-warm" style={{ color: 'var(--text-warm)' }}>{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost btn-sm !p-1.5 !rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}
