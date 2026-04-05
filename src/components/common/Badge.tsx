import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const chipClass: Record<BadgeVariant, string> = {
  default:  'chip-neutral',
  success:  'chip-green',
  warning:  'chip-warning',
  danger:   'chip-red',
  info:     'chip-neutral',
  neutral:  'chip-neutral',
  gold:     'chip-gold',
};

const dotColor: Record<BadgeVariant, string> = {
  default:  'bg-slate-400',
  success:  'bg-emerald-400',
  warning:  'bg-amber-400',
  danger:   'bg-red-400',
  info:     'bg-blue-400',
  neutral:  'bg-slate-500',
  gold:     'bg-amber-400',
};

export function Badge({ children, variant = 'default', dot, className = '' }: BadgeProps) {
  return (
    <span className={`stat-chip ${chipClass[variant]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[variant]} animate-pulse`} />
      )}
      {children}
    </span>
  );
}
