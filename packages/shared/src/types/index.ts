import type { Role, BillStatus, TaxType, Unit, DiscountType } from '../constants';

// ─── User ───
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  mfaEnabled: boolean;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IUserCreate {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export interface ILoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: IUser;
  tokens: IAuthTokens;
  mfaRequired?: boolean;
}

export interface ISession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}

// ─── Company Profile ───
export interface ICompanyProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  gstin: string;
  regNo: string;
  factoryRegNo: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  bankIfsc: string;
  logoPath: string | null;
}

// ─── Customer ───
export interface ICustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  state: string | null;
  stateCode: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICustomerCreate {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
}

// ─── Product ───
export interface IProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  hsnCode: string | null;
  unitPrice: number;
  taxRate: number;
  unit: Unit;
  stock: number;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IProductCreate {
  name: string;
  description?: string;
  sku: string;
  hsnCode?: string;
  unitPrice: number;
  taxRate: number;
  unit: Unit;
  stock: number;
  category?: string;
}

// ─── Bill ───
export interface IBill {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: ICustomer;
  customerId: string;
  status: BillStatus;
  // PO / DC
  purchaseOrderNo: string | null;
  poDate: string | null;
  dcNo: string | null;
  dcDate: string | null;
  // Consignee (Shipped To)
  consigneeName: string | null;
  consigneeAddress: string | null;
  consigneeGstin: string | null;
  consigneeState: string | null;
  consigneeStateCode: string | null;
  // Amounts
  items: IBillItem[];
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  notes: string | null;
  paidAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IBillItem {
  id: string;
  productId: string | null;
  description: string;
  hsnCode: string | null;
  quantity: number;
  unitPrice: number;
  grossValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface IBillCreate {
  customerId: string;
  invoiceDate?: string;
  purchaseOrderNo?: string;
  poDate?: string;
  dcNo?: string;
  dcDate?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeGstin?: string;
  consigneeState?: string;
  consigneeStateCode?: string;
  items: IBillItemCreate[];
  notes?: string;
}

export interface IBillItemCreate {
  productId?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

// ─── Tax Config ───
export interface ITaxConfig {
  id: string;
  name: string;
  rate: number;
  type: TaxType;
  isActive: boolean;
}

// ─── Reports ───
export interface ISalesSummary {
  totalRevenue: number;
  totalBills: number;
  paidBills: number;
  pendingAmount: number;
  averageBillValue: number;
}

export interface ITopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ICustomerSpending {
  customerId: string;
  customerName: string;
  totalSpent: number;
  billCount: number;
}

// ─── Audit Log ───
export interface IAuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string;
  timestamp: string;
}

// ─── API Response ───
export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Dashboard ───
export interface IDashboardStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  todayBills: number;
  pendingAmount: number;
  totalCustomers: number;
  totalProducts: number;
  recentBills: IBill[];
  topProducts: ITopProduct[];
  salesTrend: { date: string; amount: number; count: number }[];
}

// ─── WebSocket Events ───
export interface ISocketEvents {
  'bill:created': IBill;
  'bill:updated': IBill;
  'bill:deleted': { id: string };
  'stock:updated': { productId: string; stock: number };
  'customer:updated': ICustomer;
  'sync:request': { entity: string; lastSync: string };
}
