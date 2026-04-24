import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

/**
 * Invoice Number Generation Service
 * Format: INV-YYYY-NNNNNN (e.g., INV-2026-000001)
 * Uses PostgreSQL row-level locking for atomic increment
 */
export class InvoiceNumberService {
  /**
   * Generate the next unique invoice number
   * Thread-safe via SELECT ... FOR UPDATE
   */
  async getNextInvoiceNumber(prefix = 'INV'): Promise<string> {
    const year = new Date().getFullYear();

    // Use a transaction with row-level locking
    const result = await prisma.$transaction(async (tx) => {
      // Try to find existing counter for this year
      let counter = await tx.invoiceCounter.findFirst({
        where: { prefix, year },
      });

      if (!counter) {
        // Create counter for new year
        counter = await tx.invoiceCounter.create({
          data: { prefix, year, currentNumber: 1 },
        });
      } else {
        // Atomic increment
        counter = await tx.invoiceCounter.update({
          where: { id: counter.id },
          data: { currentNumber: { increment: 1 } },
        });
      }

      return counter;
    });

    const paddedNumber = String(result.currentNumber).padStart(6, '0');
    const invoiceNumber = `${prefix}-${year}-${paddedNumber}`;

    logger.debug(`Generated invoice number: ${invoiceNumber}`);
    return invoiceNumber;
  }
}

export const invoiceNumberService = new InvoiceNumberService();
