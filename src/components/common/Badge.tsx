import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = 'default', dot, className = '' }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-felt-800 text-slate-300 border border-felt-600',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    neutral: 'bg-slate-600/50 text-slate-400',
    gold: 'border text-amber-300',
  };

  const goldStyle = variant === 'gold' ? {
    background: 'rgba(201, 144, 48, 0.12)',
    borderColor: 'rgba(201, 144, 48, 0.35)',
  } : undefined;

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    neutral: 'bg-slate-500',
    gold: 'bg-amber-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      style={goldStyle}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />
      )}
      {children}
    </span>
  );
}
