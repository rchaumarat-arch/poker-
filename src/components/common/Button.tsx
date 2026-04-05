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
  style,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

  const variantStyles: Record<Variant, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #c99030 0%, #e8b94a 50%, #c99030 100%)',
      backgroundSize: '200% 100%',
      color: '#1a1000',
      boxShadow: '0 4px 16px rgba(201, 144, 48, 0.3), 0 1px 4px rgba(201, 144, 48, 0.2)',
      border: '1px solid rgba(232, 185, 74, 0.5)',
    },
    secondary: {},
    danger: {},
    ghost: {},
    success: {},
  };

  const variantClasses: Record<Variant, string> = {
    primary: 'font-semibold hover:brightness-110 focus:ring-amber-500 focus:ring-offset-felt-950',
    secondary: 'bg-felt-800 hover:bg-felt-700 text-slate-100 focus:ring-amber-600 border border-felt-600 focus:ring-offset-felt-950',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 focus:ring-red-500 focus:ring-offset-felt-950',
    ghost: 'bg-transparent hover:bg-felt-800 text-slate-400 hover:text-slate-100 focus:ring-amber-600 focus:ring-offset-felt-950',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 focus:ring-emerald-500 focus:ring-offset-felt-950',
  };

  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variantClasses[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
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
