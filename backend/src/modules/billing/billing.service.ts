import { prisma } from '../../config/database.js';
import { invoiceNumberService } from './invoice-number.service.js';
import { roundMoney } from '../../utils/helpers.js';
import { NotFoundError, AppError } from '../../middleware/errorHandler.middleware.js';
import { emitToAll } from '../../config/socket.js';
import { logger } from '../../utils/logger.js';
import type { BillCreateInput, BillUpdateInput } from '@billing/shared';

export class BillingService {
  /**
   * Calculate CGST + SGST split (always 50/50 of total GST rate).
   * No IGST — all invoices use CGST + SGST.
   */
  private calculateGstSplit(taxRate: number) {
    const halfRate = roundMoney(taxRate / 2);
    return { cgstRate: halfRate, sgstRate: halfRate };
  }

  /**
   * Build line items with GST calculations
   */
  private buildLineItems(items: BillCreateInput['items']) {
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;

    const itemsData = items.map((item) => {
      const grossValue = roundMoney(item.quantity * item.unitPrice);
      const gst = this.calculateGstSplit(item.taxRate);

      const cgstAmount = roundMoney(grossValue * (gst.cgstRate / 100));
      const sgstAmount = roundMoney(grossValue * (gst.sgstRate / 100));
      const taxAmount = cgstAmount + sgstAmount;
      const lineTotal = roundMoney(grossValue + taxAmount);

      subtotal += grossValue;
      cgstTotal += cgstAmount;
      sgstTotal += sgstAmount;

      return {
        productId: item.productId || null,
        description: item.description,
        hsnCode: item.hsnCode || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        grossValue,
        cgstRate: gst.cgstRate,
        cgstAmount,
        sgstRate: gst.sgstRate,
        sgstAmount,
        igstRate: 0,
        igstAmount: 0,
        taxRate: item.taxRate,
        taxAmount,
        lineTotal,
      };
    });

    const taxTotal = roundMoney(cgstTotal + sgstTotal);
    const grandTotal = roundMoney(subtotal + taxTotal);

    return { itemsData, subtotal, cgstTotal, sgstTotal, taxTotal, grandTotal };
  }

  /**
   * Create a new bill with GST line items.
   * Accepts optional `status` — defaults to DRAFT.
   */
  async createBill(data: BillCreateInput & { status?: string }, userId: string) {
    const invoiceNumber = await invoiceNumberService.getNextInvoiceNumber();

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new NotFoundError('Customer');

    const { itemsData, subtotal, cgstTotal, sgstTotal, taxTotal, grandTotal } = this.buildLineItems(data.items);

    const initialStatus = data.status === 'UNPAID' ? 'UNPAID' : 'DRAFT';

    // Create bill with items in a transaction
    const bill = await prisma.$transaction(async (tx) => {
      const newBill = await tx.bill.create({
        data: {
          invoiceNumber,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
          customerId: data.customerId,
          status: initialStatus,
          // PO / DC
          purchaseOrderNo: data.purchaseOrderNo || null,
          poDate: data.poDate ? new Date(data.poDate) : null,
          dcNo: data.dcNo || null,
          dcDate: data.dcDate ? new Date(data.dcDate) : null,
          // Consignee
          consigneeName: data.consigneeName || null,
          consigneeAddress: data.consigneeAddress || null,
          consigneeGstin: data.consigneeGstin || null,
          consigneeState: data.consigneeState || null,
          consigneeStateCode: data.consigneeStateCode || null,
          // Amounts
          subtotal,
          cgstTotal,
          sgstTotal,
          igstTotal: 0,
          taxTotal,
          discountTotal: 0,
          grandTotal,
          notes: data.notes || null,
          createdBy: userId,
          items: { create: itemsData },
        },
        include: {
          items: true,
          customer: true,
        },
      });

      // Update product stock (decrease)
      for (const item of data.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: Math.ceil(item.quantity) } },
          });
        }
      }

      return newBill;
    });

    const serialized = this.serializeBill(bill);
    emitToAll('bill:created', serialized);

    return serialized;
  }

  /**
   * Get bill by ID with all details
   */
  async getBillById(id: string) {
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!bill) throw new NotFoundError('Bill');
    return this.serializeBill(bill);
  }

  /**
   * List bills with pagination, filters, and search
   */
  async listBills(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, search, status, customerId, startDate, endDate, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orderBy: any = {};
    orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, stateCode: true } },
          creator: { select: { id: true, name: true } },
          items: true,
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.bill.count({ where }),
    ]);

    return {
      data: bills.map(this.serializeBill),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update bill status
   */
  async updateBillStatus(id: string, status: string) {
    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Bill');

    // Prevent invalid transitions
    if (existing.status === 'CANCELLED') {
      throw new AppError('Cannot change status of a cancelled bill', 400);
    }

    const updateData: any = { status };

    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: { items: true, customer: true },
    });

    const serialized = this.serializeBill(bill);
    emitToAll('bill:updated', serialized);
    return serialized;
  }

  /**
   * Update bill details — any non-cancelled bill can be edited
   */
  async updateBill(id: string, data: BillUpdateInput) {
    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Bill');

    if (existing.status === 'CANCELLED') {
      throw new AppError('Cancelled bills cannot be edited', 400);
    }

    if (data.status) {
      return this.updateBillStatus(id, data.status);
    }

    // If items are provided, recalculate
    if (data.items && data.items.length > 0) {
      const { itemsData, subtotal, cgstTotal, sgstTotal, taxTotal, grandTotal } = this.buildLineItems(data.items as BillCreateInput['items']);

      const bill = await prisma.$transaction(async (tx) => {
        // Delete old items
        await tx.billItem.deleteMany({ where: { billId: id } });

        return tx.bill.update({
          where: { id },
          data: {
            customerId: data.customerId || existing.customerId,
            invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
            purchaseOrderNo: data.purchaseOrderNo ?? undefined,
            poDate: data.poDate ? new Date(data.poDate) : undefined,
            dcNo: data.dcNo ?? undefined,
            dcDate: data.dcDate ? new Date(data.dcDate) : undefined,
            consigneeName: data.consigneeName ?? undefined,
            consigneeAddress: data.consigneeAddress ?? undefined,
            consigneeGstin: data.consigneeGstin ?? undefined,
            consigneeState: data.consigneeState ?? undefined,
            consigneeStateCode: data.consigneeStateCode ?? undefined,
            subtotal,
            cgstTotal,
            sgstTotal,
            igstTotal: 0,
            taxTotal,
            grandTotal,
            notes: data.notes ?? existing.notes,
            items: { create: itemsData },
          },
          include: { items: true, customer: true },
        });
      });

      const serialized = this.serializeBill(bill);
      emitToAll('bill:updated', serialized);
      return serialized;
    }

    // Simple field update (no items change)
    const bill = await prisma.bill.update({
      where: { id },
      data: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.purchaseOrderNo !== undefined && { purchaseOrderNo: data.purchaseOrderNo }),
        ...(data.dcNo !== undefined && { dcNo: data.dcNo }),
        ...(data.consigneeName !== undefined && { consigneeName: data.consigneeName }),
        ...(data.consigneeAddress !== undefined && { consigneeAddress: data.consigneeAddress }),
      },
      include: { items: true, customer: true },
    });

    const serialized = this.serializeBill(bill);
    emitToAll('bill:updated', serialized);
    return serialized;
  }

  /**
   * Delete bill (admin only, soft-delete by cancelling)
   */
  async deleteBill(id: string) {
    const bill = await prisma.bill.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    emitToAll('bill:deleted', { id });
    return bill;
  }

  // ─── Helper: serialize Prisma Decimal to number ───
  private serializeBill(bill: any) {
    return {
      ...bill,
      subtotal: Number(bill.subtotal),
      cgstTotal: Number(bill.cgstTotal),
      sgstTotal: Number(bill.sgstTotal),
      igstTotal: Number(bill.igstTotal),
      taxTotal: Number(bill.taxTotal),
      discountTotal: Number(bill.discountTotal),
      grandTotal: Number(bill.grandTotal),
      items: bill.items?.map((item: any) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        grossValue: Number(item.grossValue),
        cgstRate: Number(item.cgstRate),
        cgstAmount: Number(item.cgstAmount),
        sgstRate: Number(item.sgstRate),
        sgstAmount: Number(item.sgstAmount),
        igstRate: Number(item.igstRate),
        igstAmount: Number(item.igstAmount),
        taxRate: Number(item.taxRate),
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
      })),
    };
  }
}

export const billingService = new BillingService();
