import { prisma } from '../../config/database.js';
import { invoiceNumberService } from './invoice-number.service.js';
import { roundMoney } from '../../utils/helpers.js';
import { NotFoundError, AppError } from '../../middleware/errorHandler.middleware.js';
import { emitToAll } from '../../config/socket.js';
import type { BillCreateInput, BillUpdateInput } from '@billing/shared';

export class BillingService {
  /**
   * Build line items. GST applied on the SUBTOTAL only (not per item).
   */
  private buildLineItems(items: BillCreateInput['items'], cgstRate: number, sgstRate: number) {
    let subtotal = 0;

    const itemsData = items.map((item) => {
      const grossValue = roundMoney(item.quantity * item.unitPrice);
      subtotal += grossValue;

      return {
        productId: item.productId || null,
        description: item.description,
        hsnCode: item.hsnCode || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        grossValue,
        cgstRate,
        cgstAmount: 0,
        sgstRate,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        taxRate: cgstRate + sgstRate,
        taxAmount: 0,
        lineTotal: grossValue,
      };
    });

    // Apply GST on the subtotal (not per item)
    const cgstTotal = roundMoney(subtotal * (cgstRate / 100));
    const sgstTotal = roundMoney(subtotal * (sgstRate / 100));
    const taxTotal = roundMoney(cgstTotal + sgstTotal);
    const grandTotal = roundMoney(subtotal + taxTotal);

    return { itemsData, subtotal, cgstTotal, sgstTotal, taxTotal, grandTotal };
  }

  /**
   * Create a new bill.
   */
  async createBill(data: BillCreateInput & { status?: string; cgstRate?: number; sgstRate?: number }, userId: string) {
    const invoiceNumber = await invoiceNumberService.getNextInvoiceNumber();

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new NotFoundError('Customer');

    const cgstRate = data.cgstRate ?? 9;
    const sgstRate = data.sgstRate ?? 9;

    const { itemsData, subtotal, cgstTotal, sgstTotal, taxTotal, grandTotal } = this.buildLineItems(data.items, cgstRate, sgstRate);

    const initialStatus = data.status === 'UNPAID' ? 'UNPAID' : 'DRAFT';

    const bill = await prisma.$transaction(async (tx) => {
      const newBill = await tx.bill.create({
        data: {
          invoiceNumber,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
          customerId: data.customerId,
          status: initialStatus,
          purchaseOrderNo: data.purchaseOrderNo || null,
          poDate: data.poDate ? new Date(data.poDate) : null,
          dcNo: data.dcNo || null,
          dcDate: data.dcDate ? new Date(data.dcDate) : null,
          consigneeName: data.consigneeName || null,
          consigneeAddress: data.consigneeAddress || null,
          consigneeGstin: data.consigneeGstin || null,
          consigneeState: data.consigneeState || null,
          consigneeStateCode: data.consigneeStateCode || null,
          subtotal,
          cgstTotal,
          sgstTotal,
          igstTotal: 0,
          taxTotal,
          discountTotal: 0,
          grandTotal,
          notes: data.notes || null,
          createdBy: userId,
          updatedBy: userId,
          items: { create: itemsData },
        },
        include: { items: true, customer: true, creator: { select: { id: true, name: true } }, updater: { select: { id: true, name: true } } },
      });

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

  async getBillById(id: string) {
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } },
      },
    });
    if (!bill) throw new NotFoundError('Bill');
    return this.serializeBill(bill);
  }

  async listBills(params: {
    page: number; limit: number; search?: string; status?: string;
    customerId?: string; startDate?: string; endDate?: string;
    month?: string;
    sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, search, status, customerId, startDate, endDate, month, sortBy, sortOrder } = params;
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

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
      where.createdAt = { gte: monthStart, lte: monthEnd };
    } else if (startDate || endDate) {
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
          updater: { select: { id: true, name: true } },
          items: true,
        },
        skip, take: limit, orderBy,
      }),
      prisma.bill.count({ where }),
    ]);

    return {
      data: bills.map(this.serializeBill),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateBillStatus(id: string, status: string, userId?: string) {
    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Bill');
    if (existing.status === 'CANCELLED') throw new AppError('Cannot change status of a cancelled bill', 400);

    const updateData: any = { status, updatedBy: userId || existing.updatedBy };
    if (status === 'PAID') updateData.paidAt = new Date();

    const bill = await prisma.bill.update({
      where: { id }, data: updateData,
      include: { items: true, customer: true, creator: { select: { id: true, name: true } }, updater: { select: { id: true, name: true } } },
    });
    const serialized = this.serializeBill(bill);
    emitToAll('bill:updated', serialized);
    return serialized;
  }

  async updateBill(id: string, data: BillUpdateInput & { cgstRate?: number; sgstRate?: number }, userId?: string) {
    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Bill');
    if (existing.status === 'CANCELLED') throw new AppError('Cancelled bills cannot be edited', 400);

    if (data.status) return this.updateBillStatus(id, data.status, userId);

    if (data.items && data.items.length > 0) {
      const cgstRate = data.cgstRate ?? 9;
      const sgstRate = data.sgstRate ?? 9;
      const { itemsData, subtotal, cgstTotal, sgstTotal, taxTotal, grandTotal } = this.buildLineItems(data.items as BillCreateInput['items'], cgstRate, sgstRate);

      const bill = await prisma.$transaction(async (tx) => {
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
            subtotal, cgstTotal, sgstTotal, igstTotal: 0, taxTotal, grandTotal,
            notes: data.notes ?? existing.notes,
            updatedBy: userId || existing.updatedBy,
            items: { create: itemsData },
          },
          include: { items: true, customer: true, creator: { select: { id: true, name: true } }, updater: { select: { id: true, name: true } } },
        });
      });
      const serialized = this.serializeBill(bill);
      emitToAll('bill:updated', serialized);
      return serialized;
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.purchaseOrderNo !== undefined && { purchaseOrderNo: data.purchaseOrderNo }),
        updatedBy: userId || existing.updatedBy,
      },
      include: { items: true, customer: true, creator: { select: { id: true, name: true } }, updater: { select: { id: true, name: true } } },
    });
    const serialized = this.serializeBill(bill);
    emitToAll('bill:updated', serialized);
    return serialized;
  }

  async deleteBill(id: string) {
    const bill = await prisma.bill.update({ where: { id }, data: { status: 'CANCELLED' } });
    emitToAll('bill:deleted', { id });
    return bill;
  }

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
