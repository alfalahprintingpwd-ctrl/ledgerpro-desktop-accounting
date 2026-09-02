export type PaymentMethod = 'Cash' | 'Bank' | 'Split';

export interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  day: string; // e.g. "Monday"
  monthId: string; // e.g. "2026-08"
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  cashReceived: number;
  bankReceived: number;
  totalReceived: number;
  pendingAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  businessSnapshot?: BusinessProfile;
  isVoided?: boolean;
  status?: 'active' | 'voided';
  voidedAt?: string;
  voidedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  contactNumber?: string;
  designation?: string;
  signatureUrl?: string; // transparent PNG / JPG signature
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface Expense {
  id: string;
  voucherNumber: string; // e.g. "EXP-2026-0001"
  date: string; // YYYY-MM-DD
  day: string;
  monthId: string; // e.g. "2026-08"
  title: string;
  description?: string;
  category: string;
  amount: number;
  paymentSource: 'Cash' | 'Bank';
  madeBy: string; // Expense Made By / Responsible Person
  employeeId?: string; // Linked employee ID if selected
  employeeSignatureSnapshot?: string; // Signature at time of expense
  ceoNameSnapshot?: string;
  ceoSignatureSnapshot?: string;
  businessStampSnapshot?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashBankTransfer {
  id: string;
  date: string;
  monthId: string;
  from: 'Cash' | 'Bank';
  to: 'Cash' | 'Bank';
  amount: number;
  note: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  totalPurchases: number;
  totalPaid: number;
  totalPending: number;
  lastActive: string;
}

export interface MonthFile {
  id: string; // e.g., "2026-08"
  year: number; // 2026
  monthNumber: number; // 1 - 12
  monthName: string; // "August"
  status: 'active' | 'closed';
  openingCash: number;
  openingBank: number;
  openingAccount?: number; // Alias for openingBank
  openingTotal?: number; // openingCash + openingBank
  closingCash?: number;
  closingBank?: number;
  closingAccount?: number; // Alias for closingBank
  closingTotal?: number; // closingCash + closingBank
  startDate?: string;
  endDate?: string;
  closedAt?: string;
  notes?: string;
}

export interface BusinessProfile {
  name: string;
  logoUrl?: string;
  address: string;
  phone: string;
  whatsapp?: string;
  email: string;
  website?: string;
  taxRegistrationNumber?: string;
  ceoName: string;
  ceoSignatureUrl?: string;
  businessStampUrl?: string;
  invoicePrefix: string;
  nextInvoiceSeq: number;
  expensePrefix?: string; // e.g. "EXP-"
  nextExpenseSeq?: number; // e.g. 1001
  currencySymbol: string;
  defaultTaxRate: number;
  invoiceFooterNote: string;
  autoLockMinutes: number; // 0 for disabled, or 5, 15, 30
}

export interface PasswordRecoveryConfig {
  businessName: string;
  ceoName: string;
  contactPhone: string;
  securityQuestion1: string;
  securityAnswerHash1: string;
  securityQuestion2: string;
  securityAnswerHash2: string;
  recoveryPinHash: string;
  recoveryKeyHash: string;
  updatedAt: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  event:
    | 'password_reset_success'
    | 'password_reset_failed'
    | 'recovery_key_used'
    | 'recovery_setup_updated'
    | 'password_changed'
    | 'software_reset_initiated'
    | 'business_profile_updated'
    | 'invoice_edited'
    | 'invoice_deleted'
    | 'invoice_voided';
  details: string;
  ipAddress?: string;
}

export interface AppData {
  businessProfile: BusinessProfile | null;
  passwordHash: string | null;
  recoveryConfig?: PasswordRecoveryConfig | null;
  securityLogs?: SecurityAuditLog[];
  months: MonthFile[];
  activeMonthId: string;
  transactions: Transaction[];
  expenses: Expense[];
  employees?: Employee[];
  transfers: CashBankTransfer[];
  customCategories: ExpenseCategory[];
}
