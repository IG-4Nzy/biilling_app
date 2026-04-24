import { CURRENCY } from '@billing/shared';

/**
 * Format a number as INR currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY.LOCALE, {
    style: 'currency',
    currency: CURRENCY.CODE,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Round to 2 decimal places (banker's rounding)
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate line item total
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number,
  discountType?: string | null,
  discountValue?: number
): { subtotal: number; taxAmount: number; discount: number; lineTotal: number } {
  const subtotal = roundMoney(quantity * unitPrice);

  let discount = 0;
  if (discountValue && discountValue > 0) {
    if (discountType === 'PERCENTAGE') {
      discount = roundMoney(subtotal * (discountValue / 100));
    } else {
      discount = roundMoney(discountValue);
    }
  }

  const taxableAmount = subtotal - discount;
  const taxAmount = roundMoney(taxableAmount * (taxRate / 100));
  const lineTotal = roundMoney(taxableAmount + taxAmount);

  return { subtotal, taxAmount, discount, lineTotal };
}

/**
 * Generate a clean error message for client responses
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Get client IP from request
 */
export function getClientIP(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.ip ||
    'unknown'
  );
}
