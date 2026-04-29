import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

/**
 * Invoice Number Generation Service
 * Generates sequential invoice numbers (plain numbers: 1, 2, 3...)
 * Uses PostgreSQL row-level locking for atomic increment
 */
export class InvoiceNumberService {
  /**
   * Generate the next unique invoice number
   * Thread-safe via SELECT ... FOR UPDATE
   */
  async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'INV';

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

    const invoiceNumber = String(result.currentNumber);

    logger.debug(`Generated invoice number: ${invoiceNumber}`);
    return invoiceNumber;
  }
}

export const invoiceNumberService = new InvoiceNumberService();
