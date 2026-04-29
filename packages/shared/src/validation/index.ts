import { z } from 'zod';
import { ROLES, BILL_STATUSES, UNITS } from '../constants';

// ─── Auth ───
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().length(6).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[!@#$%^&*]/, 'Must contain special character'),
  role: z.enum([ROLES.ADMIN, ROLES.STAFF, ROLES.VIEWER]),
});

// ─── Customer ───
export const customerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(15).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  gstin: z.string().max(15).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  stateCode: z.string().max(2).optional().or(z.literal('')),
});

export const customerUpdateSchema = customerCreateSchema.partial();

// ─── Product ───
export const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(500).optional().or(z.literal('')),
  sku: z.string().min(1, 'SKU is required').max(50),
  hsnCode: z.string().max(8).optional().or(z.literal('')),
  unitPrice: z.number().min(0, 'Price must be positive'),
  taxRate: z.number().min(0).max(100),
  unit: z.enum([UNITS.PCS, UNITS.KG, UNITS.LTR, UNITS.MTR, UNITS.BOX, UNITS.SET, UNITS.HOUR, UNITS.SERVICE]),
  stock: z.number().int().min(0),
  category: z.string().max(100).optional().or(z.literal('')),
});

export const productUpdateSchema = productCreateSchema.partial();

// ─── Bill Item ───
export const billItemCreateSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1, 'Description required'),
  hsnCode: z.string().max(8).optional().or(z.literal('')),
  quantity: z.number().min(0.001, 'Quantity must be > 0'),
  unitPrice: z.number().min(0, 'Price must be positive'),
  taxRate: z.number().min(0).max(100),
});

// ─── Bill ───
export const billCreateSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  invoiceDate: z.string().optional(),
  purchaseOrderNo: z.string().max(50).optional().or(z.literal('')),
  poDate: z.string().optional(),
  dcNo: z.string().max(50).optional().or(z.literal('')),
  dcDate: z.string().optional(),
  consigneeName: z.string().max(200).optional().or(z.literal('')),
  consigneeAddress: z.string().max(500).optional().or(z.literal('')),
  consigneeGstin: z.string().max(15).optional().or(z.literal('')),
  consigneeState: z.string().max(50).optional().or(z.literal('')),
  consigneeStateCode: z.string().max(2).optional().or(z.literal('')),
  items: z.array(billItemCreateSchema).min(1, 'At least one item is required'),
  notes: z.string().max(1000).optional(),
  status: z.enum([BILL_STATUSES.DRAFT, BILL_STATUSES.UNPAID]).optional(),
});

export const billUpdateSchema = billCreateSchema.partial().extend({
  status: z.enum([
    BILL_STATUSES.DRAFT,
    BILL_STATUSES.UNPAID,
    BILL_STATUSES.PAID,
    BILL_STATUSES.CANCELLED,
  ]).optional(),
});

// ─── Company Profile ───
export const companyProfileSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  address: z.string().max(500),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  stateCode: z.string().max(2).optional().or(z.literal('')),
  pincode: z.string().max(10).optional().or(z.literal('')),
  phone: z.string().max(15).optional().or(z.literal('')),
  mobile: z.string().max(15).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().max(200).optional().or(z.literal('')),
  gstin: z.string().max(15).optional().or(z.literal('')),
  regNo: z.string().max(100).optional().or(z.literal('')),
  factoryRegNo: z.string().max(100).optional().or(z.literal('')),
  bankName: z.string().max(100).optional().or(z.literal('')),
  bankBranch: z.string().max(100).optional().or(z.literal('')),
  bankAccount: z.string().max(30).optional().or(z.literal('')),
  bankIfsc: z.string().max(11).optional().or(z.literal('')),
  previewPin: z.string().max(10).optional().or(z.literal('')),
});

// Re-export type helpers
export type BillCreateInput = z.infer<typeof billCreateSchema>;
export type BillUpdateInput = z.infer<typeof billUpdateSchema>;
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
