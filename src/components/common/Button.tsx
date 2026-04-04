import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  fullWidth,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

  const variants: Record<Variant, string> = {
    primary:
      'bg-emerald-500 hover:bg-emerald-400 text-white focus:ring-emerald-500 shadow-lg shadow-emerald-500/20',
    secondary:
      'bg-slate-700 hover:bg-slate-600 text-slate-100 focus:ring-slate-500 border border-slate-600',
    danger:
      'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 focus:ring-red-500',
    ghost:
      'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-100 focus:ring-slate-500',
    success:
      'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 focus:ring-emerald-500',
  };

  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
