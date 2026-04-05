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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0, 0, 0, 0.75)' }}
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeClass} rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col`}
        style={{
          background: 'linear-gradient(160deg, #0e2018 0%, #081510 100%)',
          border: '1px solid rgba(201, 144, 48, 0.2)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
      >
        <div
          className="flex items-center justify-between p-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201, 144, 48, 0.15)' }}
        >
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-felt-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}
