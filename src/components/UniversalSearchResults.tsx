import React, { useState, useMemo } from 'react';
import {
  Transaction,
  Expense,
  MonthFile,
  BusinessProfile,
  Employee,
  ExpenseCategory,
} from '../types';
import {
  formatDate,
  formatCurrency,
  getDayName,
} from '../lib/utils';
import {
  Search,
  Receipt,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  Wallet,
  Building,
  Printer,
  Download,
  Eye,
  Edit2,
  Trash2,
  X,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

interface UniversalSearchResultsProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  transactions: Transaction[];
  expenses: Expense[];
  months: MonthFile[];
  businessProfile: BusinessProfile | null;
  employees: Employee[];
  customCategories?: ExpenseCategory[];
  onViewInvoice: (tx: Transaction) => void;
  onEditInvoice: (tx: Transaction) => void;
  onDeleteInvoice: (tx: Transaction) => void;
  onViewExpenseVoucher: (exp: Expense) => void;
  onEditExpense: (exp: Expense) => void;
  onDeleteExpense: (exp: Expense) => void;
  onCloseSearch: () => void;
}

type ResultTab = 'all' | 'invoices' | 'expenses';

export const UniversalSearchResults: React.FC<UniversalSearchResultsProps> = ({
  searchQuery,
  setSearchQuery,
  transactions,
  expenses,
  months,
  businessProfile,
  employees,
  customCategories = [],
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onViewExpenseVoucher,
  onEditExpense,
  onDeleteExpense,
  onCloseSearch,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>('all');

  // Multi-tier Universal Priority Search Algorithm
  const searchEvaluation = useMemo(() => {
    const rawQ = searchQuery.trim();
    const q = rawQ.toLowerCase();
    if (!q) {
      return {
        matchedInvoices: [],
        matchedExpenses: [],
        matchedCustomerName: null,
        exactMatchMode: null,
        isInvoicePattern: false,
        isExpensePattern: false,
      };
    }

    const isInvoicePattern = /^inv[-_0-9a-z]*/i.test(rawQ);
    const isExpensePattern = /^exp[-_0-9a-z]*/i.test(rawQ);
    const cleanPhoneQuery = q.replace(/[^0-9]/g, '');

    // 1. Exact Invoice Number match (Priority 1)
    const exactInvoiceMatches = transactions.filter(
      (tx) => tx.invoiceNumber.trim().toLowerCase() === q
    );
    if (exactInvoiceMatches.length > 0) {
      return {
        matchedInvoices: exactInvoiceMatches,
        matchedExpenses: [],
        matchedCustomerName: null,
        exactMatchMode: 'EXACT_INVOICE' as const,
        isInvoicePattern: true,
        isExpensePattern: false,
      };
    }

    // 2. Exact Expense Voucher Number match (Priority 2)
    const exactExpenseMatches = expenses.filter(
      (exp) => (exp.voucherNumber || '').trim().toLowerCase() === q
    );
    if (exactExpenseMatches.length > 0) {
      return {
        matchedInvoices: [],
        matchedExpenses: exactExpenseMatches,
        matchedCustomerName: null,
        exactMatchMode: 'EXACT_EXPENSE_VOUCHER' as const,
        isInvoicePattern: false,
        isExpensePattern: true,
      };
    }

    // 3. Customer Name match (Priority 3)
    // Check if query exactly matches or starts with or contains customer name
    const customerMatches = transactions.filter(
      (tx) => tx.customerName.toLowerCase() === q
    );
    if (customerMatches.length > 0) {
      return {
        matchedInvoices: customerMatches,
        matchedExpenses: [],
        matchedCustomerName: customerMatches[0].customerName,
        exactMatchMode: 'CUSTOMER_NAME' as const,
        isInvoicePattern,
        isExpensePattern,
      };
    }

    // Check if query is explicitly matching customer name partially / substring
    const customerSubstringMatches = transactions.filter((tx) =>
      tx.customerName.toLowerCase().includes(q)
    );

    // 4. Partial Invoice Number match (Priority 4)
    const invoiceNumberMatches = transactions.filter((tx) =>
      tx.invoiceNumber.toLowerCase().includes(q)
    );

    // 5. Partial Expense Voucher match (Priority 5)
    const expenseVoucherMatches = expenses.filter((exp) =>
      (exp.voucherNumber || '').toLowerCase().includes(q)
    );

    // 6. Secondary and comprehensive matching across remaining fields
    const allInvoiceMatches = transactions.filter((tx) => {
      const matchInv = tx.invoiceNumber.toLowerCase().includes(q);
      const matchCustomer = tx.customerName.toLowerCase().includes(q);
      const phoneLower = (tx.customerPhone || '').toLowerCase();
      const cleanPhone = phoneLower.replace(/[^0-9]/g, '');
      const matchPhone =
        phoneLower.includes(q) ||
        (cleanPhoneQuery.length >= 3 && cleanPhone.includes(cleanPhoneQuery));
      const matchItems = tx.items.some(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q))
      );
      const matchNotes = tx.notes ? tx.notes.toLowerCase().includes(q) : false;

      return matchInv || matchCustomer || matchPhone || matchItems || matchNotes;
    });

    const allExpenseMatches = expenses.filter((exp) => {
      const matchVoucher = (exp.voucherNumber || '').toLowerCase().includes(q);
      const matchTitle = exp.title.toLowerCase().includes(q);
      const matchDesc = exp.description ? exp.description.toLowerCase().includes(q) : false;
      const matchCat = exp.category.toLowerCase().includes(q);
      const matchMadeBy = exp.madeBy ? exp.madeBy.toLowerCase().includes(q) : false;
      const matchNotes = exp.notes ? exp.notes.toLowerCase().includes(q) : false;

      return matchVoucher || matchTitle || matchDesc || matchCat || matchMadeBy || matchNotes;
    });

    // If customerSubstringMatches matched and no expense matched, treat as Customer result
    let detectedCustomerName: string | null = null;
    if (customerSubstringMatches.length > 0 && allExpenseMatches.length === 0 && !isInvoicePattern) {
      detectedCustomerName = customerSubstringMatches[0].customerName;
    }

    return {
      matchedInvoices: allInvoiceMatches,
      matchedExpenses: allExpenseMatches,
      matchedCustomerName: detectedCustomerName,
      exactMatchMode: null,
      isInvoicePattern,
      isExpensePattern,
    };
  }, [searchQuery, transactions, expenses]);

  const {
    matchedInvoices,
    matchedExpenses,
    matchedCustomerName,
    exactMatchMode,
    isInvoicePattern,
    isExpensePattern,
  } = searchEvaluation;

  const totalResultsCount = matchedInvoices.length + matchedExpenses.length;

  // Month label helper
  const getMonthName = (monthId: string) => {
    const found = months.find((m) => m.id === monthId);
    if (found) return `${found.monthName} ${found.year}`;
    if (monthId && monthId.length === 7) {
      const [y, m] = monthId.split('-');
      return `Month ${m}/${y}`;
    }
    return monthId || 'Current Month';
  };

  // Customer Summary Totals if customer search
  const customerTotals = useMemo(() => {
    if (matchedInvoices.length === 0) return null;
    const totalBilled = matchedInvoices.reduce((sum, tx) => sum + (tx.isVoided ? 0 : tx.grandTotal), 0);
    const totalPaid = matchedInvoices.reduce((sum, tx) => sum + (tx.isVoided ? 0 : tx.totalReceived), 0);
    const totalPending = matchedInvoices.reduce((sum, tx) => sum + (tx.isVoided ? 0 : tx.pendingAmount), 0);
    return { totalBilled, totalPaid, totalPending };
  }, [matchedInvoices]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Universal Search Results
                </h1>
                {exactMatchMode === 'EXACT_INVOICE' && (
                  <span className="bg-blue-600 text-white text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-2xs">
                    INVOICE RESULT
                  </span>
                )}
                {exactMatchMode === 'EXACT_EXPENSE_VOUCHER' && (
                  <span className="bg-amber-600 text-white text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-2xs">
                    EXPENSE VOUCHER RESULT
                  </span>
                )}
                {exactMatchMode === 'CUSTOMER_NAME' && (
                  <span className="bg-emerald-600 text-white text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-2xs">
                    CUSTOMER RESULTS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Query: <span className="font-mono font-bold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">"{searchQuery}"</span>
                {' • '}Searched across all historical monthly records and vouchers in database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCloseSearch}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Search (Esc)</span>
            </button>
          </div>
        </div>

        {/* Tab Filters if multiple record types exist */}
        {matchedInvoices.length > 0 && matchedExpenses.length > 0 && !exactMatchMode && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              View Filter:
            </span>
            <button
              onClick={() => setActiveResultTab('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeResultTab === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Records ({totalResultsCount})
            </button>
            <button
              onClick={() => setActiveResultTab('invoices')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeResultTab === 'invoices'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Receipt className="w-3 h-3" />
              <span>Invoices ({matchedInvoices.length})</span>
            </button>
            <button
              onClick={() => setActiveResultTab('expenses')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeResultTab === 'expenses'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Expense Vouchers ({matchedExpenses.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Customer Header Card if customer search */}
      {(exactMatchMode === 'CUSTOMER_NAME' || (matchedCustomerName && matchedInvoices.length > 0)) && customerTotals && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                    CUSTOMER RESULTS
                  </span>
                  <h2 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">
                    {matchedCustomerName || matchedInvoices[0]?.customerName}
                  </h2>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Found {matchedInvoices.length} transaction invoice(s) for this customer across all months.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Total Invoiced</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(customerTotals.totalBilled, currency)}</span>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase font-bold">Total Paid</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(customerTotals.totalPaid, currency)}</span>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-red-600 dark:text-red-400 block text-[10px] uppercase font-bold">Pending Balance</span>
                <span className={`font-bold ${customerTotals.totalPending > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                  {formatCurrency(customerTotals.totalPending, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NO DATA FOUND SECTION */}
      {totalResultsCount === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {isInvoicePattern
                ? `No invoice found for ${searchQuery.trim()}`
                : isExpensePattern
                ? `No expense voucher found for ${searchQuery.trim()}`
                : `No records matched "${searchQuery.trim()}"`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isInvoicePattern
                ? `We searched all historical invoices across all monthly files, but invoice number "${searchQuery.trim()}" does not exist in the database.`
                : isExpensePattern
                ? `We searched all historical expense vouchers, but voucher number "${searchQuery.trim()}" does not exist in the database.`
                : `No invoice, customer name, phone number, or expense voucher matched your search. Check the spelling or try searching by Invoice # (e.g. INV-2026-0001) or Expense Voucher # (e.g. EXP-2026-0001).`}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onCloseSearch}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Clear Search & Return to Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* MATCHED INVOICES LIST */}
      {matchedInvoices.length > 0 && (activeResultTab === 'all' || activeResultTab === 'invoices') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg tracking-wider flex items-center gap-1.5 shadow-2xs">
                <Receipt className="w-3.5 h-3.5" />
                {exactMatchMode === 'EXACT_INVOICE'
                  ? 'INVOICE RESULT'
                  : exactMatchMode === 'CUSTOMER_NAME'
                  ? 'CUSTOMER INVOICE RESULTS'
                  : `INVOICE RESULTS (${matchedInvoices.length})`}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {matchedInvoices.length} invoice(s) found
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {matchedInvoices.map((tx) => (
              <div
                key={tx.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-2xl p-5 shadow-sm transition-all duration-150 space-y-4"
              >
                {/* Invoice Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-bold text-sm rounded-xl">
                      {tx.invoiceNumber}
                    </span>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(tx.date)} ({tx.day || getDayName(tx.date)})</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {getMonthName(tx.monthId)}
                      </span>
                    </div>

                    {tx.isVoided ? (
                      <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-xs font-bold rounded-md border border-red-200 dark:border-red-800">
                        VOIDED
                      </span>
                    ) : tx.pendingAmount <= 0 ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Fully Paid
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending: {formatCurrency(tx.pendingAmount, currency)}
                      </span>
                    )}
                  </div>

                  {/* Invoice Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewInvoice(tx)}
                      title="View & Print Invoice (Preview)"
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 font-semibold text-xs rounded-lg border border-blue-200 dark:border-blue-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Invoice</span>
                    </button>

                    <button
                      onClick={() => onEditInvoice(tx)}
                      title="Edit this invoice"
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => onDeleteInvoice(tx)}
                      title="Delete or Void invoice"
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Customer Information & Summary row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Customer Details</span>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{tx.customerName}</span>
                    </div>
                    {tx.customerPhone && (
                      <div className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{tx.customerPhone}</span>
                      </div>
                    )}
                    {tx.customerAddress && (
                      <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{tx.customerAddress}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Payment Breakdown</span>
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span>Method:</span>
                      <strong className="text-slate-900 dark:text-slate-100">{tx.paymentMethod}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span>Cash Received:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(tx.cashReceived, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span>Bank Received:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(tx.bankReceived, currency)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 md:text-right flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Bill</span>
                      <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        {formatCurrency(tx.grandTotal, currency)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Received: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(tx.totalReceived, currency)}</strong>
                      {' • '}Pending: <strong className={`${tx.pendingAmount > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-500'}`}>{formatCurrency(tx.pendingAmount, currency)}</strong>
                    </div>
                  </div>
                </div>

                {/* Product / Line Items Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>Product / Work Details ({tx.items?.length || 0} items)</span>
                    <span>Subtotal: {formatCurrency(tx.subtotal, currency)}</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-[10px] uppercase">
                        <th className="px-3.5 py-2">Item Description</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3.5 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {tx.items && tx.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2 text-slate-800 dark:text-slate-200 font-medium">
                            <div>{item.name}</div>
                            {item.description && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">{item.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{formatCurrency(item.unitPrice, currency)}</td>
                          <td className="px-3.5 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.total, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Notes if available */}
                {tx.notes && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800 flex items-start gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Notes:</strong> {tx.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MATCHED EXPENSE VOUCHERS LIST */}
      {matchedExpenses.length > 0 && (activeResultTab === 'all' || activeResultTab === 'expenses') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-amber-600 text-white text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg tracking-wider flex items-center gap-1.5 shadow-2xs">
                <FileText className="w-3.5 h-3.5" />
                {exactMatchMode === 'EXACT_EXPENSE_VOUCHER'
                  ? 'EXPENSE VOUCHER RESULT'
                  : `EXPENSE VOUCHER RESULTS (${matchedExpenses.length})`}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {matchedExpenses.length} voucher(s) found
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {matchedExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 rounded-2xl p-5 shadow-sm transition-all duration-150 space-y-4"
              >
                {/* Voucher Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono font-bold text-sm rounded-xl">
                      {exp.voucherNumber || 'EXP-VOUCHER'}
                    </span>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(exp.date)} ({exp.day || getDayName(exp.date)})</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {getMonthName(exp.monthId)}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400" /> {exp.category}
                    </span>

                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border flex items-center gap-1 ${
                      exp.paymentSource === 'Cash'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }`}>
                      {exp.paymentSource === 'Cash' ? <Wallet className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                      <span>Paid via {exp.paymentSource}</span>
                    </span>
                  </div>

                  {/* Voucher Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewExpenseVoucher(exp)}
                      title="View & Print Official Expense Voucher"
                      className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-800/50 text-amber-800 dark:text-amber-200 font-semibold text-xs rounded-lg border border-amber-200 dark:border-amber-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Voucher</span>
                    </button>

                    <button
                      onClick={() => onEditExpense(exp)}
                      title="Edit this expense"
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => onDeleteExpense(exp)}
                      title="Delete expense"
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expense Details Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
                  <div className="space-y-1.5 md:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Expense Title & Description</span>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-base">
                      {exp.title}
                    </div>
                    {exp.description && (
                      <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                        {exp.description}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Responsible Person: <strong className="text-slate-900 dark:text-slate-100">{exp.madeBy || '-'}</strong></span>
                      </div>
                      {exp.employeeSignatureSnapshot && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Signed Digitally
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-start md:items-end bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block md:text-right">Total Amount</span>
                      <span className="text-xl font-extrabold text-red-600 dark:text-red-400 block md:text-right">
                        {formatCurrency(exp.amount, currency)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2">
                      Voucher ID: <span className="font-mono">{exp.voucherNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Notes if available */}
                {exp.notes && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800 flex items-start gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Notes:</strong> {exp.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
