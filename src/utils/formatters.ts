export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' €';
}

export function formatCurrencyCompact(amount: number): string {
  if (Number.isInteger(amount)) {
    return amount + ' €';
  }
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' €';
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString + 'T00:00:00'));
}

export function formatDateShort(dateString: string): string {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString + 'T00:00:00'));
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatBalanceSign(amount: number): string {
  if (amount > 0) return '+' + formatCurrencyCompact(amount);
  return formatCurrencyCompact(amount);
}
