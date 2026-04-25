import { CURRENCY } from '@billing/shared';

/**
 * Format amount as INR currency
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(CURRENCY.LOCALE, {
    style: 'currency',
    currency: CURRENCY.CODE,
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Format number with commas (Indian numbering)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Get status badge class
 */
export function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    DRAFT: 'badge-draft',
    UNPAID: 'badge-unpaid',
    PAID: 'badge-paid',
    OVERDUE: 'badge-overdue',
    CANCELLED: 'badge-cancelled',
  };
  return classes[status] || 'badge-draft';
}

/**
 * Get role badge class
 */
export function getRoleClass(role: string): string {
  const classes: Record<string, string> = {
    ADMIN: 'badge-admin',
    STAFF: 'badge-staff',
    VIEWER: 'badge-viewer',
  };
  return classes[role] || 'badge-viewer';
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Delay cleanup to let the download start
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 500);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
