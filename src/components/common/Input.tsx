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
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-slate-400 text-sm select-none">{prefix}</span>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-xl text-white placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
            transition-colors text-sm
            ${prefix ? 'pl-8' : 'pl-3.5'}
            ${suffix ? 'pr-10' : 'pr-3.5'}
            py-2.5
            ${className}
          `}
          style={{
            background: '#0e2018',
            border: error ? '1px solid rgb(239,68,68)' : '1px solid rgba(201,144,48,0.2)',
          }}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-slate-400 text-sm select-none">{suffix}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
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

export function CurrencyInput({
  label,
  value,
  onChange,
  error,
  placeholder = '0',
  className = '',
  id,
}: CurrencyInputProps) {
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
