import React, { useState, useMemo, useEffect } from 'react';
import {
  Transaction,
  Expense,
  CashBankTransfer,
  MonthFile,
  BusinessProfile,
  Employee,
  ExpenseCategory,
} from '../types';
import {
  calculateMonthTotals,
  syncAllMonthBalances,
  getPreviousMonthFile,
  formatCurrency,
  formatDate,
  useLocalDateWatcher,
  getLocalAccountingDate,
  addDaysToLocalDate,
  getDayName,
} from '../lib/utils';
import {
  TrendingUp,
  Receipt,
  Clock,
  CreditCard,
  Wallet,
  Building,
  DollarSign,
  Calendar,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  User,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardProps {
  activeMonth: MonthFile | undefined;
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
  months?: MonthFile[];
  employees?: Employee[];
  customCategories?: ExpenseCategory[];
  onOpenNewSalesModal: () => void;
  onOpenNewExpenseModal: () => void;
  onViewInvoice: (tx: Transaction) => void;
  onEditInvoice?: (tx: Transaction) => void;
  onDeleteInvoice?: (tx: Transaction) => void;
  onViewExpenseVoucher?: (exp: Expense) => void;
  onEditExpense?: (exp: Expense) => void;
  onDeleteExpense?: (exp: Expense) => void;
}

type TabType = 'all' | 'sales' | 'expenses';
type DateFilterType = 'month' | 'today' | 'yesterday' | 'specific' | 'range';
type StatusFilterType = 'all' | 'pending' | 'paid' | 'cash' | 'bank';

interface UnifiedEntry {
  id: string;
  type: 'sale' | 'expense';
  docNumber: string;
  date: string;
  day: string;
  monthId: string;
  titleOrCustomer: string;
  subtitleOrContact?: string;
  details: string;
  totalAmount: number;
  receivedAmount?: number;
  pendingAmount?: number;
  paymentMethodOrSource: string;
  isVoided?: boolean;
  rawSale?: Transaction;
  rawExpense?: Expense;
  createdAt: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeMonth,
  transactions,
  expenses,
  transfers,
  businessProfile,
  months = [],
  employees = [],
  customCategories = [],
  onOpenNewSalesModal,
  onOpenNewExpenseModal,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onViewExpenseVoucher,
  onEditExpense,
  onDeleteExpense,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const monthId = activeMonth?.id || '';

  // Monthly totals
  const monthTotals = calculateMonthTotals(monthId, transactions, expenses, transfers, activeMonth);

  // Chronological previous month for carry-forward context
  const previousMonthFile = useMemo(() => {
    if (!months || !activeMonth) return undefined;
    return getPreviousMonthFile(activeMonth.id, months);
  }, [months, activeMonth]);

  // Live Local Date & Timezone
  const { currentDate: todayStr, timeZone } = useLocalDateWatcher();
  const yesterdayStr = addDaysToLocalDate(todayStr, -1);

  // Today's stats
  const todayTx = transactions.filter((t) => t.date === todayStr);
  const todayExp = expenses.filter((e) => e.date === todayStr);
  const todaySales = todayTx.reduce((sum, t) => sum + (t.isVoided ? 0 : t.grandTotal), 0);
  const todayReceived = todayTx.reduce((sum, t) => sum + (t.isVoided ? 0 : t.totalReceived), 0);
  const todayPending = todayTx.reduce((sum, t) => sum + (t.isVoided ? 0 : t.pendingAmount), 0);
  const todayExpenses = todayExp.reduce((sum, e) => sum + e.amount, 0);

  // Recharts: Cash vs Bank Balance
  const pieData = [
    { name: 'Cash Balance', value: Math.max(0, monthTotals.cashBalance), color: '#10b981' },
    { name: 'Bank Balance', value: Math.max(0, monthTotals.bankBalance), color: '#2563eb' },
  ];

  // Recharts: Sales vs Expenses vs Received
  const barData = [
    {
      name: activeMonth?.monthName || 'Current Month',
      Sales: monthTotals.totalSales,
      Received: monthTotals.totalReceived,
      Expenses: monthTotals.totalExpenses,
      Pending: monthTotals.totalPending,
    },
  ];

  // --- Active Month Transaction Table State ---
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [specificDate, setSpecificDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  
  // Pagination State
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, dateFilter, specificDate, startDate, endDate, statusFilter, pageSize]);

  // Global ESC key to clear search inside dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // 1. Get all active month records
  const activeMonthTransactions = useMemo(() => {
    return transactions.filter((t) => t.monthId === monthId);
  }, [transactions, monthId]);

  const activeMonthExpenses = useMemo(() => {
    return expenses.filter((e) => e.monthId === monthId);
  }, [expenses, monthId]);

  // 2. Build Unified Entries list
  const unifiedEntries: UnifiedEntry[] = useMemo(() => {
    const list: UnifiedEntry[] = [];

    if (activeTab === 'all' || activeTab === 'sales') {
      activeMonthTransactions.forEach((tx) => {
        list.push({
          id: tx.id,
          type: 'sale',
          docNumber: tx.invoiceNumber,
          date: tx.date,
          day: tx.day || getDayName(tx.date),
          monthId: tx.monthId,
          titleOrCustomer: tx.customerName,
          subtitleOrContact: tx.customerPhone,
          details: tx.items.map((i) => i.name).join(', ') || 'Sale Invoice Items',
          totalAmount: tx.grandTotal,
          receivedAmount: tx.totalReceived,
          pendingAmount: tx.pendingAmount,
          paymentMethodOrSource: tx.paymentMethod,
          isVoided: tx.isVoided || tx.status === 'voided',
          rawSale: tx,
          createdAt: tx.createdAt || tx.date,
        });
      });
    }

    if (activeTab === 'all' || activeTab === 'expenses') {
      activeMonthExpenses.forEach((exp) => {
        list.push({
          id: exp.id,
          type: 'expense',
          docNumber: exp.voucherNumber,
          date: exp.date,
          day: exp.day || getDayName(exp.date),
          monthId: exp.monthId,
          titleOrCustomer: exp.title,
          subtitleOrContact: exp.madeBy ? `By: ${exp.madeBy}` : undefined,
          details: exp.description || exp.category || 'Expense Voucher Entry',
          totalAmount: exp.amount,
          paymentMethodOrSource: exp.paymentSource,
          rawExpense: exp,
          createdAt: exp.createdAt || exp.date,
        });
      });
    }

    // Sort chronologically descending (newest date first, then newest createdAt / ID)
    return list.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [activeTab, activeMonthTransactions, activeMonthExpenses]);

  // 3. Filter entries based on search, date, and status
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const cleanPhoneQuery = query.replace(/[^0-9]/g, '');

    return unifiedEntries.filter((entry) => {
      // Date Filter
      if (dateFilter === 'today' && entry.date !== todayStr) return false;
      if (dateFilter === 'yesterday' && entry.date !== yesterdayStr) return false;
      if (dateFilter === 'specific' && specificDate && entry.date !== specificDate) return false;
      if (dateFilter === 'range') {
        if (startDate && entry.date < startDate) return false;
        if (endDate && entry.date > endDate) return false;
      }

      // Status / Source Filter
      if (entry.type === 'sale') {
        if (statusFilter === 'pending' && (entry.pendingAmount || 0) <= 0) return false;
        if (statusFilter === 'paid' && (entry.pendingAmount || 0) > 0) return false;
        if (statusFilter === 'cash' && entry.paymentMethodOrSource !== 'Cash' && entry.paymentMethodOrSource !== 'Split') return false;
        if (statusFilter === 'bank' && entry.paymentMethodOrSource !== 'Bank' && entry.paymentMethodOrSource !== 'Split') return false;
      } else if (entry.type === 'expense') {
        if (statusFilter === 'pending' || statusFilter === 'paid') {
          // Expenses don't have pending states; if user specifically filters for pending/paid, hide expenses
          return false;
        }
        if (statusFilter === 'cash' && entry.paymentMethodOrSource !== 'Cash') return false;
        if (statusFilter === 'bank' && entry.paymentMethodOrSource !== 'Bank') return false;
      }

      // Search Query Filter
      if (query) {
        const matchDoc = entry.docNumber.toLowerCase().includes(query);
        const matchTitle = entry.titleOrCustomer.toLowerCase().includes(query);
        const matchSubtitle = (entry.subtitleOrContact || '').toLowerCase().includes(query);
        const matchDetails = entry.details.toLowerCase().includes(query);
        const matchMethod = entry.paymentMethodOrSource.toLowerCase().includes(query);

        // Additional phone match for customer
        let matchPhone = false;
        if (entry.subtitleOrContact) {
          const cleanPhone = entry.subtitleOrContact.replace(/[^0-9]/g, '');
          matchPhone = cleanPhoneQuery.length >= 3 && cleanPhone.includes(cleanPhoneQuery);
        }

        // Additional search fields for sales
        let matchSaleItems = false;
        if (entry.rawSale) {
          matchSaleItems = entry.rawSale.items.some(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              (item.description && item.description.toLowerCase().includes(query))
          );
        }

        // Additional search fields for expenses
        let matchExpFields = false;
        if (entry.rawExpense) {
          matchExpFields =
            entry.rawExpense.category.toLowerCase().includes(query) ||
            (entry.rawExpense.madeBy && entry.rawExpense.madeBy.toLowerCase().includes(query));
        }

        if (
          !matchDoc &&
          !matchTitle &&
          !matchSubtitle &&
          !matchDetails &&
          !matchMethod &&
          !matchPhone &&
          !matchSaleItems &&
          !matchExpFields
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    unifiedEntries,
    searchQuery,
    dateFilter,
    todayStr,
    yesterdayStr,
    specificDate,
    startDate,
    endDate,
    statusFilter,
  ]);

  // Financial totals of the filtered entries
  const filteredSalesTotal = useMemo(() => {
    return filteredEntries
      .filter((e) => e.type === 'sale' && !e.isVoided)
      .reduce((sum, e) => sum + e.totalAmount, 0);
  }, [filteredEntries]);

  const filteredReceivedTotal = useMemo(() => {
    return filteredEntries
      .filter((e) => e.type === 'sale' && !e.isVoided)
      .reduce((sum, e) => sum + (e.receivedAmount || 0), 0);
  }, [filteredEntries]);

  const filteredPendingTotal = useMemo(() => {
    return filteredEntries
      .filter((e) => e.type === 'sale' && !e.isVoided)
      .reduce((sum, e) => sum + (e.pendingAmount || 0), 0);
  }, [filteredEntries]);

  const filteredExpensesTotal = useMemo(() => {
    return filteredEntries
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.totalAmount, 0);
  }, [filteredEntries]);

  // Pagination calculation
  const totalEntries = filteredEntries.length;
  const isAllPages = pageSize === 'all';
  const effectivePageSize = isAllPages ? totalEntries : pageSize;
  const totalPages = isAllPages || totalEntries === 0 ? 1 : Math.ceil(totalEntries / (pageSize as number));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedEntries = useMemo(() => {
    if (isAllPages) return filteredEntries;
    const startIndex = (validCurrentPage - 1) * (pageSize as number);
    return filteredEntries.slice(startIndex, startIndex + (pageSize as number));
  }, [filteredEntries, isAllPages, validCurrentPage, pageSize]);

  // Row click handler
  const handleRowClick = (entry: UnifiedEntry) => {
    if (entry.type === 'sale' && entry.rawSale) {
      onViewInvoice(entry.rawSale);
    } else if (entry.type === 'expense' && entry.rawExpense && onViewExpenseVoucher) {
      onViewExpenseVoucher(entry.rawExpense);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Month Notice */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" /> Active Accounting Month • {activeMonth?.monthName} {activeMonth?.year}
          </div>
          <h2 className="text-2xl font-bold">
            {businessProfile?.name || 'Business Accounting Dashboard'}
          </h2>
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
            <span>
              Status: {activeMonth?.status === 'closed' ? '🔒 Locked Month' : '🟢 Active Accounting Month'}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-300">
              {activeMonthTransactions.length} Sales & {activeMonthExpenses.length} Expenses Recorded
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="dash-create-sale-btn"
            onClick={onOpenNewSalesModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> + Create Customer Sale
          </button>
          <button
            id="dash-create-expense-btn"
            onClick={onOpenNewExpenseModal}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <CreditCard className="w-4 h-4 text-rose-400" /> + Add Expense
          </button>
        </div>
      </div>

      {/* Main Financial Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg border border-transparent dark:border-blue-800/40">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(monthTotals.totalSales, currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>{monthTotals.invoiceCount} Invoices in {activeMonth?.monthName}</span>
          </div>
        </div>

        {/* Card 2: Total Received */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Received</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg border border-transparent dark:border-emerald-800/40">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(monthTotals.totalReceived, currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cash: {formatCurrency(monthTotals.cashReceived, currency)} • Bank: {formatCurrency(monthTotals.bankReceived, currency)}
          </div>
        </div>

        {/* Card 3: Total Pending */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pending</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg border border-transparent dark:border-amber-800/40">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(monthTotals.totalPending, currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Accounts Receivable / Uncollected
          </div>
        </div>

        {/* Card 4: Total Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg border border-transparent dark:border-rose-800/40">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(monthTotals.totalExpenses, currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cash: {formatCurrency(monthTotals.cashExpenses, currency)} • Bank: {formatCurrency(monthTotals.bankExpenses, currency)}
          </div>
        </div>
      </div>

      {/* Cash, Bank & Available Balance Cards with Carry-Forward Context */}
      <div className="space-y-2">
        {/* Month Context & Carry-Forward Info Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Active Month Financial Position: {activeMonth?.monthName} {activeMonth?.year}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                activeMonth?.status === 'closed'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
              }`}
            >
              {activeMonth?.status === 'closed' ? '🔒 Closed / Locked' : '🟢 Active Accounting Month'}
            </span>
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
            <span>
              {previousMonthFile ? (
                <>
                  Carried forward from <strong className="text-slate-700 dark:text-slate-200">{previousMonthFile.monthName} {previousMonthFile.year}</strong> closing balance ({formatCurrency(monthTotals.openingTotal, currency)})
                </>
              ) : (
                <>
                  Initial Base Opening Capital: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(monthTotals.openingTotal, currency)}</strong>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Physical Cash Balance Card */}
          <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Physical Cash Balance</span>
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-lg text-emerald-700 dark:text-emerald-300">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight">
                {formatCurrency(monthTotals.cashBalance, currency)}
              </div>
            </div>

            {/* Formula Breakdown */}
            <div className="mt-4 pt-3 border-t border-emerald-100 dark:border-emerald-900/40 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Opening Cash (Carried):</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(monthTotals.openingCash, currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                <span>+ Cash Received (Sales):</span>
                <span>+{formatCurrency(monthTotals.cashReceived, currency)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                <span>- Cash Expenses Paid:</span>
                <span>-{formatCurrency(monthTotals.cashExpenses, currency)}</span>
              </div>
              {monthTotals.netCashTransfers !== 0 && (
                <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                  <span>± Net Bank Transfers:</span>
                  <span>{monthTotals.netCashTransfers > 0 ? '+' : ''}{formatCurrency(monthTotals.netCashTransfers, currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-dashed border-emerald-200 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-200">
                <span>Current Available Cash:</span>
                <span>{formatCurrency(monthTotals.cashBalance, currency)}</span>
              </div>
            </div>
          </div>

          {/* Bank / Account Balance Card */}
          <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50/40 dark:from-blue-950/30 dark:via-slate-900 dark:to-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Bank / Account Balance</span>
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/60 rounded-lg text-blue-700 dark:text-blue-300">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-blue-900 dark:text-blue-100 tracking-tight">
                {formatCurrency(monthTotals.bankBalance, currency)}
              </div>
            </div>

            {/* Formula Breakdown */}
            <div className="mt-4 pt-3 border-t border-blue-100 dark:border-blue-900/40 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Opening Bank (Carried):</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(monthTotals.openingBank, currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                <span>+ Bank Received (Sales):</span>
                <span>+{formatCurrency(monthTotals.bankReceived, currency)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                <span>- Bank Expenses Paid:</span>
                <span>-{formatCurrency(monthTotals.bankExpenses, currency)}</span>
              </div>
              {monthTotals.netBankTransfers !== 0 && (
                <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                  <span>± Net Cash Transfers:</span>
                  <span>{monthTotals.netBankTransfers > 0 ? '+' : ''}{formatCurrency(monthTotals.netBankTransfers, currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-dashed border-blue-200 dark:border-blue-800 font-bold text-blue-900 dark:text-blue-200">
                <span>Current Available Account:</span>
                <span>{formatCurrency(monthTotals.bankBalance, currency)}</span>
              </div>
            </div>
          </div>

          {/* Total Available Money Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 dark:from-slate-900 dark:to-slate-950 text-white rounded-xl p-5 shadow-md flex flex-col justify-between border border-slate-800">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Available Money</span>
                <div className="p-1.5 bg-slate-800 rounded-lg text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white tracking-tight">
                {formatCurrency(monthTotals.totalAvailableBalance, currency)}
              </div>
            </div>

            {/* Formula Breakdown */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Opening (Cash + Bank):</span>
                <span className="font-semibold text-white">{formatCurrency(monthTotals.openingTotal, currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>+ Total Revenue Received:</span>
                <span>+{formatCurrency(monthTotals.totalReceived, currency)}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-medium">
                <span>- Total Expenses Paid:</span>
                <span>-{formatCurrency(monthTotals.totalExpenses, currency)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-dashed border-slate-700 font-bold text-white">
                <span className="text-blue-300">Total (Cash + Bank Balance):</span>
                <span>{formatCurrency(monthTotals.totalAvailableBalance, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Activity Snapshot */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Today's Activity Snapshot ({formatDate(todayStr)})
          </span>
          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            {timeZone}
          </span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">Today's Sales</span>
            <strong className="text-base text-slate-900 dark:text-slate-100 font-bold block mt-0.5">
              {formatCurrency(todaySales, currency)}
            </strong>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">Today's Received</span>
            <strong className="text-base text-emerald-700 dark:text-emerald-400 font-bold block mt-0.5">
              {formatCurrency(todayReceived, currency)}
            </strong>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">Today's Pending</span>
            <strong className="text-base text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
              {formatCurrency(todayPending, currency)}
            </strong>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">Today's Expenses</span>
            <strong className="text-base text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
              {formatCurrency(todayExpenses, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE MONTH TRANSACTIONS HUB (Complete, Searchable & Directly Editable) */}
      {/* ========================================================================= */}
      <div id="active-month-transactions-section" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Active Month Transactions
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold text-[11px] rounded-full border border-blue-200 dark:border-blue-800/60">
                {activeMonth?.monthName} {activeMonth?.year}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Filter by Sales or Expenses, search records, and directly View, Edit, or Void/Delete without switching pages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="dash-show-all-entries-btn"
              onClick={() => {
                setPageSize('all');
                setDateFilter('month');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                pageSize === 'all' && dateFilter === 'month' && !searchQuery
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Show All ({activeMonthTransactions.length + activeMonthExpenses.length} Records)
            </button>
          </div>
        </div>

        {/* REQUIRED PROMINENT DASHBOARD BUTTONS / TABS */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Main Tabs: [ ALL TRANSACTIONS ] [ SALES ] [ EXPENSES ] */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              {/* 1. ALL TRANSACTIONS TAB */}
              <button
                id="dash-tab-all"
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm ring-1 ring-slate-900/10 dark:ring-blue-500'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="tracking-wide">ALL TRANSACTIONS</span>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    activeTab === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {activeMonthTransactions.length + activeMonthExpenses.length}
                </span>
              </button>

              {/* 2. SALES BUTTON */}
              <button
                id="dash-tab-sales"
                type="button"
                onClick={() => setActiveTab('sales')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'sales'
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/60 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span className="tracking-wide">SALES</span>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    activeTab === 'sales'
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {activeMonthTransactions.length}
                </span>
              </button>

              {/* 3. EXPENSES BUTTON */}
              <button
                id="dash-tab-expenses"
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'expenses'
                    ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-600'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/60 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="tracking-wide">EXPENSES</span>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    activeTab === 'expenses'
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {activeMonthExpenses.length}
                </span>
              </button>
            </div>

            {/* In-Section Live Search Input (Dynamic placeholder per tab) */}
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="dash-search-input"
                type="text"
                placeholder={
                  activeTab === 'sales'
                    ? 'Search Sales by Inv#, Customer, Phone, or Item details...'
                    : activeTab === 'expenses'
                    ? 'Search Expenses by Voucher#, Title, Category, Details, or Staff...'
                    : 'Search All by Inv#/Voucher#, Customer/Title, Contact, Items, Category...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title="Clear search (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Second Control Line: Date Filters & Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date:
              </span>

              <button
                id="dash-filter-month"
                onClick={() => setDateFilter('month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dateFilter === 'month'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Current Month
              </button>

              <button
                id="dash-filter-today"
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dateFilter === 'today'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Today
              </button>

              <button
                id="dash-filter-yesterday"
                onClick={() => setDateFilter('yesterday')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dateFilter === 'yesterday'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Yesterday
              </button>

              <button
                id="dash-filter-specific"
                onClick={() => setDateFilter('specific')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dateFilter === 'specific'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Specific Date
              </button>

              <button
                id="dash-filter-range"
                onClick={() => setDateFilter('range')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dateFilter === 'range'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Date Range
              </button>

              {/* Specific Date Picker */}
              {dateFilter === 'specific' && (
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-100 font-mono"
                />
              )}

              {/* Date Range Inputs */}
              {dateFilter === 'range' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-100 font-mono"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Status / Method Quick Filter */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>

              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>

              {activeTab !== 'expenses' && (
                <>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    }`}
                  >
                    Pending / Unpaid
                  </button>

                  <button
                    onClick={() => setStatusFilter('paid')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                      statusFilter === 'paid'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    Fully Paid
                  </button>
                </>
              )}

              <button
                onClick={() => setStatusFilter('cash')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  statusFilter === 'cash'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                Cash
              </button>

              <button
                onClick={() => setStatusFilter('bank')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  statusFilter === 'bank'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                Bank
              </button>
            </div>
          </div>

          {/* Filtered Financial Subtotals Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl text-xs border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center gap-4 text-slate-700 dark:text-slate-300">
              <span>
                Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredEntries.length}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white font-bold">{unifiedEntries.length}</strong>{' '}
                {activeTab === 'sales'
                  ? 'Sales Invoices'
                  : activeTab === 'expenses'
                  ? 'Expense Vouchers'
                  : 'Active Month Records'}
              </span>
              {searchQuery && (
                <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                  <Search className="w-3 h-3" /> Matching "{searchQuery}"
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              {(activeTab === 'all' || activeTab === 'sales') && (
                <>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Total Sales: </span>
                    <strong className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                      {formatCurrency(filteredSalesTotal, currency)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Total Received: </span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      {formatCurrency(filteredReceivedTotal, currency)}
                    </strong>
                  </div>
                  {filteredPendingTotal > 0 && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Total Pending: </span>
                      <strong className="text-amber-600 dark:text-amber-400 font-bold font-mono">
                        {formatCurrency(filteredPendingTotal, currency)}
                      </strong>
                    </div>
                  )}
                </>
              )}

              {(activeTab === 'all' || activeTab === 'expenses') && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Total Expenses: </span>
                  <strong className="text-rose-600 dark:text-rose-400 font-bold font-mono">
                    {formatCurrency(filteredExpensesTotal, currency)}
                  </strong>
                </div>
              )}

              {activeTab === 'all' && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Net Operating: </span>
                  <strong
                    className={`font-bold font-mono ${
                      filteredReceivedTotal - filteredExpensesTotal >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(filteredReceivedTotal - filteredExpensesTotal, currency)}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3 DISTINCT VIEWS: ALL TRANSACTIONS, SALES ONLY, EXPENSES ONLY */}
          {/* ========================================================================= */}

          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400/80" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {activeTab === 'sales'
                  ? 'No sales invoices match the selected filters.'
                  : activeTab === 'expenses'
                  ? 'No expense vouchers match the selected filters.'
                  : 'No active month transactions match the selected filters.'}
              </p>
              <p className="text-[11px] text-slate-500">
                Try clearing the search query or adjusting the date/status filters.
              </p>
              {(searchQuery || dateFilter !== 'month' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('month');
                    setStatusFilter('all');
                  }}
                  className="mt-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Filters
                </button>
              )}
            </div>
          ) : activeTab === 'sales' ? (
            /* ========================================================================= */
            /* VIEW 1: SALES ONLY TABLE (Dedicated Sales Invoices Columns) */
            /* ========================================================================= */
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-900 dark:bg-slate-950 text-white font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Day</th>
                    <th className="py-3 px-3.5">Invoice Number</th>
                    <th className="py-3 px-3.5">Customer Name</th>
                    <th className="py-3 px-3.5">Contact</th>
                    <th className="py-3 px-3.5">Work / Product Details</th>
                    <th className="py-3 px-3.5 text-right">Total Bill</th>
                    <th className="py-3 px-3.5 text-right">Received Amount</th>
                    <th className="py-3 px-3.5 text-right">Pending Amount</th>
                    <th className="py-3 px-3.5 text-center">Payment Method</th>
                    <th className="py-3 px-3.5 text-center min-w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {paginatedEntries.map((entry) => {
                    const tx = entry.rawSale;
                    if (!tx) return null;
                    const isVoided = entry.isVoided;

                    return (
                      <tr
                        key={`sale-${tx.id}`}
                        onClick={() => onViewInvoice(tx)}
                        className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/70 transition cursor-pointer ${
                          isVoided ? 'bg-red-50/30 dark:bg-red-950/20 opacity-75' : ''
                        }`}
                        title="Click row to view complete Sales Invoice"
                      >
                        {/* 1. Date */}
                        <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>

                        {/* 2. Day */}
                        <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {tx.day || getDayName(tx.date)}
                        </td>

                        {/* 3. Invoice Number */}
                        <td className="py-3 px-3.5 font-mono font-bold whitespace-nowrap">
                          <span className={isVoided ? 'line-through text-slate-400' : 'text-blue-600 dark:text-blue-400'}>
                            {tx.invoiceNumber}
                          </span>
                          {isVoided && (
                            <span className="block text-[9px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wide bg-red-100 dark:bg-red-950/60 px-1 py-0.2 rounded w-max mt-0.5">
                              VOIDED
                            </span>
                          )}
                        </td>

                        {/* 4. Customer Name */}
                        <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100">
                          {tx.customerName}
                        </td>

                        {/* 5. Contact */}
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                          {tx.customerPhone ? tx.customerPhone : <span className="text-slate-400 italic">—</span>}
                        </td>

                        {/* 6. Work / Product Details */}
                        <td className="py-3 px-3.5 max-w-[240px]">
                          <div
                            className="truncate text-slate-700 dark:text-slate-300 font-medium"
                            title={tx.items.map((i) => i.name).join(', ')}
                          >
                            {tx.items.map((i) => i.name).join(', ') || 'Custom Sale Items'}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            {tx.items.length} line item{tx.items.length !== 1 ? 's' : ''}
                          </div>
                        </td>

                        {/* 7. Total Bill */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <span className={isVoided ? 'line-through text-slate-400' : ''}>
                            {formatCurrency(tx.grandTotal, currency)}
                          </span>
                        </td>

                        {/* 8. Received Amount */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          <span className={isVoided ? 'line-through text-slate-400' : ''}>
                            {formatCurrency(tx.totalReceived, currency)}
                          </span>
                        </td>

                        {/* 9. Pending Amount */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                          {isVoided ? (
                            <span className="text-red-500 dark:text-red-400 font-bold text-[10px]">REVERSED</span>
                          ) : tx.pendingAmount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded text-[11px] border border-amber-200 dark:border-amber-800/60">
                              {formatCurrency(tx.pendingAmount, currency)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                              Paid
                            </span>
                          )}
                        </td>

                        {/* 10. Payment Method */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                            {tx.paymentMethod}
                          </span>
                        </td>

                        {/* 11. Actions: VIEW, EDIT, DELETE / VOID */}
                        <td className="py-3 px-3.5 text-center">
                          <div
                            className="flex items-center justify-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* VIEW BUTTON */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewInvoice(tx);
                              }}
                              title="View & Print Sales Invoice"
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-[10px] rounded-lg transition cursor-pointer border border-blue-200 dark:border-blue-800/60 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> VIEW
                            </button>

                            {/* EDIT BUTTON */}
                            {onEditInvoice && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditInvoice(tx);
                                }}
                                title="Edit Sales Invoice"
                                className="px-2 py-1 bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold text-[10px] rounded-lg transition cursor-pointer border border-amber-200 dark:border-amber-800/60 flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" /> EDIT
                              </button>
                            )}

                            {/* DELETE / VOID BUTTON */}
                            {onDeleteInvoice && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteInvoice(tx);
                                }}
                                title="Void or Delete Sales Invoice"
                                className="px-2 py-1 bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-bold text-[10px] rounded-lg transition cursor-pointer border border-rose-200 dark:border-rose-800/60 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> DELETE
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'expenses' ? (
            /* ========================================================================= */
            /* VIEW 2: EXPENSES ONLY TABLE (Dedicated Expense Vouchers Columns) */
            /* ========================================================================= */
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-900 dark:bg-slate-950 text-white font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Day</th>
                    <th className="py-3 px-3.5">Voucher Number</th>
                    <th className="py-3 px-3.5">Expense Title</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-3.5">Expense Details</th>
                    <th className="py-3 px-3.5 text-right">Amount</th>
                    <th className="py-3 px-3.5 text-center">Payment Source</th>
                    <th className="py-3 px-3.5">Responsible Person</th>
                    <th className="py-3 px-3.5 text-center min-w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {paginatedEntries.map((entry) => {
                    const exp = entry.rawExpense;
                    if (!exp) return null;

                    return (
                      <tr
                        key={`exp-${exp.id}`}
                        onClick={() => onViewExpenseVoucher && onViewExpenseVoucher(exp)}
                        className="hover:bg-rose-50/40 dark:hover:bg-slate-800/70 transition cursor-pointer"
                        title="Click row to view complete Expense Voucher"
                      >
                        {/* 1. Date */}
                        <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDate(exp.date)}
                        </td>

                        {/* 2. Day */}
                        <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {exp.day || getDayName(exp.date)}
                        </td>

                        {/* 3. Voucher Number */}
                        <td className="py-3 px-3.5 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {exp.voucherNumber}
                        </td>

                        {/* 4. Expense Title */}
                        <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100">
                          {exp.title}
                        </td>

                        {/* 5. Category */}
                        <td className="py-3 px-3.5">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                            {exp.category}
                          </span>
                        </td>

                        {/* 6. Expense Details */}
                        <td className="py-3 px-3.5 max-w-[240px]">
                          <div
                            className="truncate text-slate-700 dark:text-slate-300 font-medium"
                            title={exp.description || exp.title}
                          >
                            {exp.description || <span className="text-slate-400 italic">—</span>}
                          </div>
                        </td>

                        {/* 7. Amount */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatCurrency(exp.amount, currency)}
                        </td>

                        {/* 8. Payment Source */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              exp.paymentSource === 'Cash'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {exp.paymentSource}
                          </span>
                        </td>

                        {/* 9. Responsible Person */}
                        <td className="py-3 px-3.5 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                          {exp.madeBy ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {exp.madeBy}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* 10. Actions: VIEW, EDIT, DELETE */}
                        <td className="py-3 px-3.5 text-center">
                          <div
                            className="flex items-center justify-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* VIEW BUTTON */}
                            {onViewExpenseVoucher && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewExpenseVoucher(exp);
                                }}
                                title="View & Print Expense Voucher"
                                className="px-2 py-1 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-[10px] rounded-lg transition cursor-pointer border border-blue-200 dark:border-blue-800/60 flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> VIEW
                              </button>
                            )}

                            {/* EDIT BUTTON */}
                            {onEditExpense && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditExpense(exp);
                                }}
                                title="Edit Expense Voucher"
                                className="px-2 py-1 bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold text-[10px] rounded-lg transition cursor-pointer border border-amber-200 dark:border-amber-800/60 flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" /> EDIT
                              </button>
                            )}

                            {/* DELETE BUTTON */}
                            {onDeleteExpense && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteExpense(exp);
                                }}
                                title="Delete Expense Voucher"
                                className="px-2 py-1 bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-bold text-[10px] rounded-lg transition cursor-pointer border border-rose-200 dark:border-rose-800/60 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> DELETE
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 3: ALL TRANSACTIONS (Combined View with Clear Identification) */
            /* ========================================================================= */
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-900 dark:bg-slate-950 text-white font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5">Type</th>
                    <th className="py-3 px-3.5">Doc #</th>
                    <th className="py-3 px-3.5">Date & Day</th>
                    <th className="py-3 px-3.5">Customer / Title</th>
                    <th className="py-3 px-3.5">Contact / Staff</th>
                    <th className="py-3 px-3.5">Details / Items</th>
                    <th className="py-3 px-3.5 text-right">Total Bill / Amount</th>
                    <th className="py-3 px-3.5 text-right">Received / Paid</th>
                    <th className="py-3 px-3.5 text-right">Pending / Status</th>
                    <th className="py-3 px-3.5 text-center">Payment</th>
                    <th className="py-3 px-3.5 text-center min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {paginatedEntries.map((entry) => {
                    const isSale = entry.type === 'sale';
                    const isVoided = entry.isVoided;

                    return (
                      <tr
                        key={`${entry.type}-${entry.id}`}
                        onClick={() => handleRowClick(entry)}
                        className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/70 transition cursor-pointer ${
                          isVoided ? 'bg-red-50/30 dark:bg-red-950/20 opacity-75' : ''
                        }`}
                        title={isSale ? 'Click row to open Invoice' : 'Click row to open Expense Voucher'}
                      >
                        {/* Type Badge */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {isSale ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                              <Receipt className="w-3 h-3" /> SALE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                              <CreditCard className="w-3 h-3" /> EXPENSE
                            </span>
                          )}
                        </td>

                        {/* Document Number */}
                        <td className="py-3 px-3.5 font-mono font-bold whitespace-nowrap">
                          <span
                            className={
                              isVoided
                                ? 'line-through text-slate-400'
                                : isSale
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {entry.docNumber}
                          </span>
                          {isVoided && (
                            <span className="block text-[9px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wide bg-red-100 dark:bg-red-950/60 px-1 py-0.2 rounded w-max mt-0.5">
                              VOIDED
                            </span>
                          )}
                        </td>

                        {/* Date & Day */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatDate(entry.date)}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            {entry.day}
                          </div>
                        </td>

                        {/* Customer / Title */}
                        <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100">
                          {entry.titleOrCustomer}
                        </td>

                        {/* Contact / Staff */}
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {entry.subtitleOrContact || <span className="text-slate-400 italic">—</span>}
                        </td>

                        {/* Details / Items */}
                        <td className="py-3 px-3.5 max-w-[200px]">
                          <div className="truncate text-slate-700 dark:text-slate-300 font-medium" title={entry.details}>
                            {entry.details}
                          </div>
                          {isSale && entry.rawSale && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              {entry.rawSale.items.length} line item(s)
                            </div>
                          )}
                          {!isSale && entry.rawExpense && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              Category: {entry.rawExpense.category}
                            </div>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <span className={isVoided ? 'line-through text-slate-400' : ''}>
                            {formatCurrency(entry.totalAmount, currency)}
                          </span>
                        </td>

                        {/* Received / Paid Amount */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                          {isSale ? (
                            <span
                              className={
                                isVoided
                                  ? 'line-through text-slate-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }
                            >
                              {formatCurrency(entry.receivedAmount || 0, currency)}
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">
                              {formatCurrency(entry.totalAmount, currency)}
                            </span>
                          )}
                        </td>

                        {/* Pending / Status */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                          {isSale ? (
                            isVoided ? (
                              <span className="text-red-500 dark:text-red-400 font-bold text-[10px]">REVERSED</span>
                            ) : (entry.pendingAmount || 0) > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-[11px] border border-amber-200 dark:border-amber-800/60">
                                {formatCurrency(entry.pendingAmount || 0, currency)}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                                Paid
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal">N/A</span>
                          )}
                        </td>

                        {/* Payment Method / Source */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                            {entry.paymentMethodOrSource}
                          </span>
                        </td>

                        {/* DIRECT ACTIONS: View, Edit, Delete */}
                        <td className="py-3 px-3.5 text-center">
                          <div
                            className="flex items-center justify-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* VIEW BUTTON */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSale && entry.rawSale) {
                                  onViewInvoice(entry.rawSale);
                                } else if (!isSale && entry.rawExpense && onViewExpenseVoucher) {
                                  onViewExpenseVoucher(entry.rawExpense);
                                }
                              }}
                              title={isSale ? 'View Invoice (Print / Save PDF)' : 'View Expense Voucher'}
                              className="p-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg transition cursor-pointer border border-blue-200/60 dark:border-blue-800/40"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* DIRECT EDIT BUTTON */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSale && entry.rawSale && onEditInvoice) {
                                  onEditInvoice(entry.rawSale);
                                } else if (!isSale && entry.rawExpense && onEditExpense) {
                                  onEditExpense(entry.rawExpense);
                                }
                              }}
                              title={isSale ? 'Directly Edit Sales Invoice' : 'Directly Edit Expense Voucher'}
                              className="p-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg transition cursor-pointer border border-amber-200/60 dark:border-amber-800/40"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* DIRECT DELETE / VOID BUTTON */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSale && entry.rawSale && onDeleteInvoice) {
                                  onDeleteInvoice(entry.rawSale);
                                } else if (!isSale && entry.rawExpense && onDeleteExpense) {
                                  onDeleteExpense(entry.rawExpense);
                                }
                              }}
                              title={isSale ? 'Delete or Void Invoice' : 'Delete Expense Voucher'}
                              className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer border border-rose-200/60 dark:border-rose-800/40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        {/* Pagination & View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Per-Page Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Rows per page:</span>
            <select
              id="dash-page-size-select"
              value={String(pageSize)}
              onChange={(e) => {
                const val = e.target.value;
                setPageSize(val === 'all' ? 'all' : Number(val));
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">All ({filteredEntries.length})</option>
            </select>
            <span>
              Showing {isAllPages ? 1 : Math.min((validCurrentPage - 1) * (pageSize as number) + 1, totalEntries)} to{' '}
              {isAllPages ? totalEntries : Math.min(validCurrentPage * (pageSize as number), totalEntries)} of {totalEntries} entries
            </span>
          </div>

          {/* Page Navigation */}
          {!isAllPages && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
                Page {validCurrentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Charts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">
            Monthly Financial Performance Overview ({activeMonth?.monthName} {activeMonth?.year})
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => formatCurrency(value, currency)}
                />
                <Legend />
                <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash vs Bank Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
            Cash vs Bank Holdings
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => formatCurrency(value, currency)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center border-t border-slate-100 dark:border-slate-800 pt-2">
            Gross Operating Profit: <strong className="text-emerald-700 dark:text-emerald-400">{formatCurrency(monthTotals.grossOperatingResult, currency)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
