import { AppData, BusinessProfile, MonthFile, Transaction, Expense, ExpenseCategory, CashBankTransfer, PasswordRecoveryConfig, SecurityAuditLog } from '../types';
import { simpleHash } from './utils';
import { hashAnswer, hashRecoveryKey } from './security';

const STORAGE_KEY = 'ledgerpro_accounting_db_v1';

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat_1', name: 'Printing Material' },
  { id: 'cat_2', name: 'Paper & Cardstock' },
  { id: 'cat_3', name: 'Ink & Toner' },
  { id: 'cat_4', name: 'Salaries & Wages' },
  { id: 'cat_5', name: 'Electricity & Utilities' },
  { id: 'cat_6', name: 'Rent' },
  { id: 'cat_7', name: 'Internet & Phone' },
  { id: 'cat_8', name: 'Transportation & Delivery' },
  { id: 'cat_9', name: 'Maintenance & Repairs' },
  { id: 'cat_10', name: 'Office Expenses' },
  { id: 'cat_11', name: 'Marketing & Ads' },
  { id: 'cat_12', name: 'Other' },
];

export function getInitialData(): AppData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return {
          businessProfile: parsed.businessProfile || null,
          passwordHash: parsed.passwordHash || null,
          recoveryConfig: parsed.recoveryConfig || null,
          securityLogs: parsed.securityLogs || [],
          months: parsed.months || [],
          activeMonthId: parsed.activeMonthId || '',
          transactions: parsed.transactions || [],
          expenses: parsed.expenses || [],
          transfers: parsed.transfers || [],
          customCategories: parsed.customCategories || DEFAULT_CATEGORIES,
        };
      }
    } catch (e) {
      console.error('Failed to parse local storage data', e);
    }
  }

  return {
    businessProfile: null,
    passwordHash: null,
    recoveryConfig: null,
    securityLogs: [],
    months: [],
    activeMonthId: '',
    transactions: [],
    expenses: [],
    transfers: [],
    customCategories: DEFAULT_CATEGORIES,
  };
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data to local storage', e);
  }
}

export function clearAppData(): AppData {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error('Error clearing local storage', e);
  }
  return {
    businessProfile: null,
    passwordHash: null,
    recoveryConfig: null,
    securityLogs: [],
    months: [],
    activeMonthId: '',
    transactions: [],
    expenses: [],
    transfers: [],
    customCategories: DEFAULT_CATEGORIES,
  };
}

export function generateSampleData(): AppData {
  const profile: BusinessProfile = {
    name: 'Alfalah Printing Studio & Creative Media',
    address: 'Plot 14-B, Commercial Area, Phase 4, PWD Highway',
    phone: '+92 300 5551234',
    whatsapp: '+92 300 5551234',
    email: 'info@alfalahprinting.com',
    website: 'www.alfalahprinting.com',
    taxRegistrationNumber: 'NTN: 8294021-7',
    ceoName: 'Mohammad Farooq',
    invoicePrefix: 'INV-',
    nextInvoiceSeq: 1007,
    currencySymbol: 'Rs. ',
    defaultTaxRate: 5,
    invoiceFooterNote: 'Thank you for choosing Alfalah Printing Studio! All printed materials are checked for quality before delivery.',
    autoLockMinutes: 0,
    // SVGs/DataURIs for default demo stamp & signature
    ceoSignatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="60" viewBox="0 0 150 60"><path d="M10 40 Q 30 10 50 35 T 90 20 T 130 45 T 140 30" stroke="%231e3a8a" stroke-width="2.5" fill="none"/><text x="15" y="55" font-family="sans-serif" font-size="10" fill="%231e3a8a">M. Farooq (CEO)</text></svg>',
    businessStampUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke="%23dc2626" stroke-width="3" fill="none"/><circle cx="50" cy="50" r="38" stroke="%23dc2626" stroke-width="1" stroke-dasharray="3 3" fill="none"/><text x="50" y="38" font-family="sans-serif" font-size="9" font-weight="bold" fill="%23dc2626" text-anchor="middle">ALFALAH PRINTING</text><text x="50" y="52" font-family="sans-serif" font-size="8" fill="%23dc2626" text-anchor="middle">★ PAID & VERIFIED ★</text><text x="50" y="65" font-family="sans-serif" font-size="8" fill="%23dc2626" text-anchor="middle">OFFICIAL STAMP</text></svg>',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" rx="12" fill="%231e3a8a"/><text x="30" y="38" font-family="sans-serif" font-size="26" font-weight="bold" fill="%23ffffff" text-anchor="middle">AP</text></svg>',
  };

  const months: MonthFile[] = [
    {
      id: '2026-06',
      year: 2026,
      monthNumber: 6,
      monthName: 'June',
      status: 'closed',
      openingCash: 25000,
      openingBank: 150000,
      closedAt: '2026-06-30T23:59:59Z',
    },
    {
      id: '2026-07',
      year: 2026,
      monthNumber: 7,
      monthName: 'July',
      status: 'closed',
      openingCash: 42000,
      openingBank: 210000,
      closedAt: '2026-07-31T23:59:59Z',
    },
    {
      id: '2026-08',
      year: 2026,
      monthNumber: 8,
      monthName: 'August',
      status: 'active',
      openingCash: 58000,
      openingBank: 285000,
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx_1001',
      invoiceNumber: 'INV-2026-1001',
      date: '2026-08-01',
      day: 'Saturday',
      monthId: '2026-08',
      customerName: 'Apex Corporate Solutions',
      customerPhone: '+92 321 8889900',
      customerAddress: 'Office 12, Tech Tower, Blue Area',
      items: [
        { id: 'item_1', name: 'Tri-fold Marketing Flyers', description: 'Art paper 150gsm full color double side', quantity: 2000, unitPrice: 12, total: 24000 },
        { id: 'item_2', name: 'Executive Business Cards', description: 'Velvet lamination with gold spot UV (500 boxes)', quantity: 5, unitPrice: 1800, total: 9000 },
      ],
      subtotal: 33000,
      discount: 1000,
      tax: 1600,
      grandTotal: 33600,
      cashReceived: 10000,
      bankReceived: 23600,
      totalReceived: 33600,
      pendingAmount: 0,
      paymentMethod: 'Split',
      notes: 'Full payment received. Order delivered on time.',
      createdAt: '2026-08-01T10:30:00Z',
      updatedAt: '2026-08-01T10:30:00Z',
    },
    {
      id: 'tx_1002',
      invoiceNumber: 'INV-2026-1002',
      date: '2026-08-03',
      day: 'Monday',
      monthId: '2026-08',
      customerName: 'Metro Event Organizers',
      customerPhone: '+92 333 4445566',
      customerAddress: 'Plaza 88, Commercial Market',
      items: [
        { id: 'item_3', name: 'Flex Banner Standee 6x3ft', description: 'Star flex 380gsm with heavy metal stand', quantity: 4, unitPrice: 3500, total: 14000 },
        { id: 'item_4', name: 'Backdrop Stage Banner 15x10ft', description: 'High resolution digital printing with ringlets', quantity: 1, unitPrice: 12000, total: 12000 },
      ],
      subtotal: 26000,
      discount: 1000,
      tax: 1250,
      grandTotal: 26250,
      cashReceived: 15000,
      bankReceived: 0,
      totalReceived: 15000,
      pendingAmount: 11250,
      paymentMethod: 'Cash',
      notes: 'Advance cash payment received. Balance due upon delivery.',
      createdAt: '2026-08-03T11:15:00Z',
      updatedAt: '2026-08-03T11:15:00Z',
    },
    {
      id: 'tx_1003',
      invoiceNumber: 'INV-2026-1003',
      date: '2026-08-05',
      day: 'Wednesday',
      monthId: '2026-08',
      customerName: 'Beacon Heights Academy',
      customerPhone: '+92 312 9988776',
      customerAddress: 'Campus 3, Park Road',
      items: [
        { id: 'item_5', name: 'Student ID Cards with Lanyards', description: 'PVC magnetic smart cards printed both sides', quantity: 450, unitPrice: 120, total: 54000 },
        { id: 'item_6', name: 'Annual Prospectus Booklet 24 Pages', description: 'Glossy 170gsm cover with saddle stitch', quantity: 300, unitPrice: 250, total: 75000 },
      ],
      subtotal: 129000,
      discount: 4000,
      tax: 6250,
      grandTotal: 131250,
      cashReceived: 0,
      bankReceived: 100000,
      totalReceived: 100000,
      pendingAmount: 31250,
      paymentMethod: 'Bank',
      notes: 'Bank transfer via Meezan Bank. Remaining Rs. 31,250 pending.',
      createdAt: '2026-08-05T14:20:00Z',
      updatedAt: '2026-08-05T14:20:00Z',
    },
    {
      id: 'tx_1004',
      invoiceNumber: 'INV-2026-1004',
      date: '2026-08-07',
      day: 'Friday',
      monthId: '2026-08',
      customerName: 'Gourmet Bakers & Cafe',
      customerPhone: '+92 345 1122334',
      customerAddress: 'Main Civic Center, Sector F-6',
      items: [
        { id: 'item_7', name: 'Custom Food Packaging Boxes', description: 'Food grade bleached card with dielectric lamination', quantity: 1000, unitPrice: 45, total: 45000 },
        { id: 'item_8', name: 'Takeaway Paper Bags', description: 'Kraft paper 120gsm with rope handles', quantity: 1000, unitPrice: 28, total: 28000 },
      ],
      subtotal: 73000,
      discount: 3000,
      tax: 3500,
      grandTotal: 73500,
      cashReceived: 73500,
      bankReceived: 0,
      totalReceived: 73500,
      pendingAmount: 0,
      paymentMethod: 'Cash',
      notes: 'Full cash payment upon order collection.',
      createdAt: '2026-08-07T16:00:00Z',
      updatedAt: '2026-08-07T16:00:00Z',
    },
    {
      id: 'tx_1005',
      invoiceNumber: 'INV-2026-1005',
      date: '2026-08-07',
      day: 'Friday',
      monthId: '2026-08',
      customerName: 'Dr. Tariq Dental Clinic',
      customerPhone: '+92 301 7766554',
      customerAddress: 'Mediplex Plaza, G-9 Markaz',
      items: [
        { id: 'item_9', name: 'Prescription Pad (2-part carbonless)', description: '50 sets per pad, custom numbered', quantity: 20, unitPrice: 350, total: 7000 },
        { id: 'item_10', name: 'Appointment Reminder Cards', description: '350gsm matte cardstock', quantity: 1000, unitPrice: 4.5, total: 4500 },
      ],
      subtotal: 11500,
      discount: 500,
      tax: 550,
      grandTotal: 11550,
      cashReceived: 5000,
      bankReceived: 6550,
      totalReceived: 11550,
      pendingAmount: 0,
      paymentMethod: 'Split',
      notes: 'Split payment: Rs. 5,000 Cash + Rs. 6,550 Online Bank transfer.',
      createdAt: '2026-08-07T18:10:00Z',
      updatedAt: '2026-08-07T18:10:00Z',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp_1',
      date: '2026-08-02',
      day: 'Sunday',
      monthId: '2026-08',
      title: 'Bulk Paper Roll Stock 150gsm',
      description: 'Purchased 4 rolls from Master Paper Mill',
      category: 'Paper & Cardstock',
      amount: 42000,
      paymentSource: 'Bank',
      createdAt: '2026-08-02T12:00:00Z',
      updatedAt: '2026-08-02T12:00:00Z',
    },
    {
      id: 'exp_2',
      date: '2026-08-04',
      day: 'Tuesday',
      monthId: '2026-08',
      title: 'Epson Solvent Ink Refill Set (CMYK)',
      description: 'Original Epson Japanese Ink Bottles',
      category: 'Ink & Toner',
      amount: 18500,
      paymentSource: 'Cash',
      createdAt: '2026-08-04T15:30:00Z',
      updatedAt: '2026-08-04T15:30:00Z',
    },
    {
      id: 'exp_3',
      date: '2026-08-05',
      day: 'Wednesday',
      monthId: '2026-08',
      title: 'Shop Monthly Rent (August)',
      description: 'Paid to Plaza Owner Mr. Hashmi',
      category: 'Rent',
      amount: 65000,
      paymentSource: 'Bank',
      createdAt: '2026-08-05T09:00:00Z',
      updatedAt: '2026-08-05T09:00:00Z',
    },
    {
      id: 'exp_4',
      date: '2026-08-06',
      day: 'Thursday',
      monthId: '2026-08',
      title: 'Electricity Bill (Commercial)',
      description: 'IESCO Bill for July Machine Operations',
      category: 'Electricity & Utilities',
      amount: 28400,
      paymentSource: 'Bank',
      createdAt: '2026-08-06T14:20:00Z',
      updatedAt: '2026-08-06T14:20:00Z',
    },
    {
      id: 'exp_5',
      date: '2026-08-07',
      day: 'Friday',
      monthId: '2026-08',
      title: 'Tea & Refreshment Refreshment Expense',
      description: 'Daily office snacks & tea for staff & clients',
      category: 'Office Expenses',
      amount: 3200,
      paymentSource: 'Cash',
      createdAt: '2026-08-07T19:00:00Z',
      updatedAt: '2026-08-07T19:00:00Z',
    },
  ];

  const transfers: CashBankTransfer[] = [
    {
      id: 'tr_1',
      date: '2026-08-03',
      monthId: '2026-08',
      from: 'Cash',
      to: 'Bank',
      amount: 20000,
      note: 'Deposited excess shop cash into Meezan Bank business account',
      createdAt: '2026-08-03T17:00:00Z',
    },
  ];

  const sampleRecoveryConfig: PasswordRecoveryConfig = {
    businessName: profile.name,
    ceoName: profile.ceoName,
    contactPhone: profile.phone,
    securityQuestion1: 'What was the name of your first school or college?',
    securityAnswerHash1: hashAnswer('Government High School'),
    securityQuestion2: 'What is your primary bank or registration city?',
    securityAnswerHash2: hashAnswer('Islamabad'),
    recoveryPinHash: simpleHash('8844'),
    recoveryKeyHash: hashRecoveryKey('AFPS-7K92-XP41-8M6Q'),
    updatedAt: new Date().toISOString(),
  };

  const sampleSecurityLogs: SecurityAuditLog[] = [
    {
      id: 'log_init',
      timestamp: new Date().toISOString(),
      event: 'recovery_setup_updated',
      details: 'Initial password recovery profile configured during setup wizard.',
      ipAddress: 'Offline Local Desktop',
    },
  ];

  return {
    businessProfile: profile,
    passwordHash: simpleHash('admin123'),
    recoveryConfig: sampleRecoveryConfig,
    securityLogs: sampleSecurityLogs,
    months,
    activeMonthId: '2026-08',
    transactions,
    expenses,
    transfers,
    customCategories: DEFAULT_CATEGORIES,
  };
}
