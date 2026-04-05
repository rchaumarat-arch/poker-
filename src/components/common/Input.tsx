import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  suffix?: string;
  prefix?: string;
}

export function Input({
  label,
  error,
  hint,
  suffix,
  prefix,
  className = '',
  id,
  style,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium" style={{ color: '#b8c8c0' }}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm select-none" style={{ color: 'var(--text-muted)' }}>
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          className={`input-poker ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''} ${
            error ? 'border-red-500/60' : ''
          } ${className}`}
          style={{
            borderColor: error ? 'rgba(239,68,68,0.5)' : undefined,
            ...style,
          }}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-sm select-none" style={{ color: 'var(--text-muted)' }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

interface CurrencyInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function CurrencyInput({ label, value, onChange, error, placeholder = '0', className = '', id }: CurrencyInputProps) {
  return (
    <Input
      id={id}
      label={label}
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      suffix="€"
      error={error}
      placeholder={placeholder}
      className={className}
    />
  );
}
