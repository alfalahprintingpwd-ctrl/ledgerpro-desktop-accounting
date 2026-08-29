import React, { useState, useRef, useEffect } from 'react';
import { Transaction, Expense, CashBankTransfer, BusinessProfile, MonthFile } from '../types';
import {
  formatDate,
  getDayName,
  formatCurrency,
  downloadCSV,
  getLocalAccountingDate,
  addDaysToLocalDate,
  formatDateTimeLocal,
  formatDateTimePKT,
  getSystemTimeZone,
} from '../lib/utils';
import {
  Calendar,
  Printer,
  Download,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  Building,
  Wallet,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  DollarSign,
  Clock,
  User,
  Phone,
  Layers,
  ArrowRightLeft,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { sanitizeFilename } from '../lib/pdf';
import { triggerNativeWindowsPrint } from '../lib/print';
import { PrintPreviewModal } from './PrintPreviewModal';
import { generateExcelReportPdf } from '../lib/excelReportPdf';
import { ExcelReportView } from './ExcelReportView';

interface DailyReportProps {
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
  months?: MonthFile[];
  activeMonthId?: string;
  onViewInvoice?: (tx: Transaction) => void;
}

export const DailyReport: React.FC<DailyReportProps> = ({
  transactions,
  expenses,
  transfers,
  businessProfile,
  months = [],
  activeMonthId = '',
  onViewInvoice,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currency = businessProfile?.currencySymbol || '$';
  const timeZone = getSystemTimeZone();

  // Default to today's local date YYYY-MM-DD
  const todayStr = getLocalAccountingDate();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const currentLocalToday = getLocalAccountingDate();

  // Navigate dates helper
  const changeDateByDays = (days: number) => {
    setSelectedDate((prev) => addDaysToLocalDate(prev, days));
  };

  const dayName = getDayName(selectedDate);
  const formattedSelectedDate = formatDate(selectedDate);

  // Keyboard Shortcuts Listener for Daily Report navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        changeDateByDays(-1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        changeDateByDays(1);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setSelectedDate(todayStr);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, todayStr]);

  // Filter Data for Selected Date
  const dailyTx = transactions.filter((t) => t.date === selectedDate);
  const activeDailyTx = dailyTx.filter((t) => !t.isVoided && t.status !== 'voided');
  const voidedDailyTx = dailyTx.filter((t) => t.isVoided || t.status === 'voided');

  const dailyExpenses = expenses.filter((e) => e.date === selectedDate);
  const dailyTransfers = transfers.filter((tr) => tr.date === selectedDate);

  // Invoices with payments received on this date
  const paymentsReceivedList = activeDailyTx.filter((t) => t.totalReceived > 0);
  // Invoices with pending balances on this date
  const pendingInvoicesList = activeDailyTx.filter((t) => t.pendingAmount > 0);

  // Financial Calculations for Selected Date
  const dailyTotalSales = activeDailyTx.reduce((sum, t) => sum + t.grandTotal, 0);
  const dailyTotalReceived = activeDailyTx.reduce((sum, t) => sum + t.totalReceived, 0);
  const dailyTotalPending = activeDailyTx.reduce((sum, t) => sum + t.pendingAmount, 0);

  const dailyCashReceived = activeDailyTx.reduce((sum, t) => sum + t.cashReceived, 0);
  const dailyBankReceived = activeDailyTx.reduce((sum, t) => sum + t.bankReceived, 0);

  const dailyTotalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const dailyCashExpenses = dailyExpenses
    .filter((e) => e.paymentSource === 'Cash')
    .reduce((sum, e) => sum + e.amount, 0);
  const dailyBankExpenses = dailyExpenses
    .filter((e) => e.paymentSource === 'Bank')
    .reduce((sum, e) => sum + e.amount, 0);

  // Transfers net
  const cashTransferNet = dailyTransfers.reduce((net, tr) => {
    if (tr.from === 'Bank' && tr.to === 'Cash') return net + tr.amount;
    if (tr.from === 'Cash' && tr.to === 'Bank') return net - tr.amount;
    return net;
  }, 0);

  const bankTransferNet = dailyTransfers.reduce((net, tr) => {
    if (tr.from === 'Cash' && tr.to === 'Bank') return net + tr.amount;
    if (tr.from === 'Bank' && tr.to === 'Cash') return net - tr.amount;
    return net;
  }, 0);

  // Net Daily Collections & Operating Result
  const netDailyCashCollections = dailyCashReceived - dailyCashExpenses + cashTransferNet;
  const netDailyBankCollections = dailyBankReceived - dailyBankExpenses + bankTransferNet;
  const netTotalDailyCollections = dailyTotalReceived - dailyTotalExpenses;
  const grossDailyOperatingResult = dailyTotalSales - dailyTotalExpenses;

  // Derive Current Month's Context for Opening/Closing Balances
  const selectedMonthId = selectedDate.slice(0, 7);
  const currentMonthFile = months.find((m) => m.id === selectedMonthId);
  const openingCash = currentMonthFile?.openingCash || 0;
  const openingBank = currentMonthFile?.openingBank || 0;

  // Month-to-date up to this selected date for comprehensive closing balances
  const mtdTx = transactions.filter(
    (t) => t.date.slice(0, 7) === selectedMonthId && t.date <= selectedDate && !t.isVoided && t.status !== 'voided'
  );
  const mtdExpenses = expenses.filter(
    (e) => e.date.slice(0, 7) === selectedMonthId && e.date <= selectedDate
  );
  const mtdTransfers = transfers.filter(
    (tr) => tr.date.slice(0, 7) === selectedMonthId && tr.date <= selectedDate
  );

  const mtdCashReceived = mtdTx.reduce((sum, t) => sum + t.cashReceived, 0);
  const mtdBankReceived = mtdTx.reduce((sum, t) => sum + t.bankReceived, 0);
  const mtdCashExpenses = mtdExpenses.filter((e) => e.paymentSource === 'Cash').reduce((sum, e) => sum + e.amount, 0);
  const mtdBankExpenses = mtdExpenses.filter((e) => e.paymentSource === 'Bank').reduce((sum, e) => sum + e.amount, 0);
  const mtdCashTransferNet = mtdTransfers.reduce((net, tr) => {
    if (tr.from === 'Bank' && tr.to === 'Cash') return net + tr.amount;
    if (tr.from === 'Cash' && tr.to === 'Bank') return net - tr.amount;
    return net;
  }, 0);

  const closingCashBalance = openingCash + mtdCashReceived - mtdCashExpenses + mtdCashTransferNet;
  const closingBankBalance = openingBank + mtdBankReceived - mtdBankExpenses - mtdCashTransferNet;
  const totalAvailableBalance = closingCashBalance + closingBankBalance;

  const filename = sanitizeFilename(`Daily-Report-${formattedSelectedDate}.pdf`);

  const handlePrint = () => {
    setToast(null);
    triggerNativeWindowsPrint({
      title: `Daily Report - ${formattedSelectedDate}`,
      landscape: true,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
  };

  const handleDownloadPDF = async () => {
    setToast(null);
    const result = await generateExcelReportPdf(
      {
        reportType: 'Daily',
        periodTitle: `${formattedSelectedDate} (${dayName})`,
        businessProfile,
        currencySymbol: currency,
        totalSale: dailyTotalSales,
        totalExpense: dailyTotalExpenses,
        availableMoney: totalAvailableBalance,
        cashBalance: closingCashBalance,
        bankBalance: closingBankBalance,
        transactions: activeDailyTx,
        expenses: dailyExpenses,
        closingCash: closingCashBalance,
        closingBank: closingBankBalance,
      },
      filename
    );
    if (result.success) {
      setToast({ type: 'success', message: result.message });
    } else if (!result.cancelled) {
      setToast({ type: 'error', message: result.message });
    }
  };

  const handleExportCSV = () => {
    const rows: (string | number)[][] = [
      ['Daily Financial Report', `${formattedSelectedDate} (${dayName})`],
      ['Business Name', businessProfile?.name || ''],
      ['Generated On', formatDateTimeLocal()],
      ['Timezone', timeZone],
      [],
      ['SECTION A — FINANCIAL SUMMARY'],
      ['Total Sales Generated', dailyTotalSales],
      ['Total Received', dailyTotalReceived],
      ['Total Pending Receivables', dailyTotalPending],
      ['Total Expenses', dailyTotalExpenses],
      ['Cash Received', dailyCashReceived],
      ['Bank Received', dailyBankReceived],
      ['Cash Expenses', dailyCashExpenses],
      ['Bank Expenses', dailyBankExpenses],
      ['Closing Cash Balance', closingCashBalance],
      ['Closing Bank Balance', closingBankBalance],
      ['Total Available Balance', totalAvailableBalance],
      ['Number of Invoices', activeDailyTx.length],
      ['Number of Expenses', dailyExpenses.length],
      ['Gross Operating Result (Sales - Expenses)', grossDailyOperatingResult],
      ['Net Cash Flow (Received - Expenses)', netTotalDailyCollections],
      [],
      ['SECTION B.1 — SALES & INVOICES DETAILS'],
      [
        'Invoice #',
        'Date',
        'Day',
        'Customer Name',
        'Phone',
        'Line Items Breakdown',
        'Subtotal',
        'Discount',
        'Tax',
        'Grand Total',
        'Cash Received',
        'Bank Received',
        'Total Received',
        'Pending Amount',
        'Payment Method',
        'Status',
      ],
      ...dailyTx.map((tx) => [
        tx.invoiceNumber,
        tx.date,
        tx.day || dayName,
        tx.customerName,
        tx.customerPhone || '',
        tx.items.map((it) => `${it.name} (Qty: ${it.quantity} @ ${it.unitPrice} = ${it.total})`).join('; '),
        tx.subtotal,
        tx.discount,
        tx.tax,
        tx.grandTotal,
        tx.cashReceived,
        tx.bankReceived,
        tx.totalReceived,
        tx.pendingAmount,
        tx.paymentMethod,
        tx.isVoided || tx.status === 'voided' ? 'Voided' : tx.pendingAmount === 0 ? 'Paid' : 'Partial/Pending',
      ]),
      [],
      ['SECTION B.2 — PAYMENTS RECEIVED DETAILS'],
      ['Invoice #', 'Payment Date', 'Customer', 'Original Invoice Date', 'Payment Amount', 'Payment Method', 'Cash Received', 'Bank Received', 'Remaining Pending'],
      ...paymentsReceivedList.map((tx) => [
        tx.invoiceNumber,
        tx.date,
        tx.customerName,
        tx.date,
        tx.totalReceived,
        tx.paymentMethod,
        tx.cashReceived,
        tx.bankReceived,
        tx.pendingAmount,
      ]),
      [],
      ['SECTION B.3 — OUTSTANDING PENDING DETAILS'],
      ['Customer Name', 'Phone', 'Invoice #', 'Invoice Date', 'Total Bill', 'Total Received', 'Pending Amount', 'Status'],
      ...pendingInvoicesList.map((tx) => [
        tx.customerName,
        tx.customerPhone || '',
        tx.invoiceNumber,
        tx.date,
        tx.grandTotal,
        tx.totalReceived,
        tx.pendingAmount,
        'Pending Balance',
      ]),
      [],
      ['SECTION B.4 — EXPENSE DETAILS'],
      ['Voucher #', 'Date', 'Day', 'Category', 'Title / Description', 'Made By', 'Payment Method', 'Cash Expense', 'Bank Expense', 'Total Amount'],
      ...dailyExpenses.map((e) => [
        e.voucherNumber || `EXP-${e.date.slice(0, 4)}-0001`,
        e.date,
        e.day || dayName,
        e.category,
        `${e.title}${e.description ? ` (${e.description})` : ''}`,
        e.madeBy || '-',
        e.paymentSource,
        e.paymentSource === 'Cash' ? e.amount : 0,
        e.paymentSource === 'Bank' ? e.amount : 0,
        e.amount,
      ]),
      [],
      ['SECTION B.5 — CASH & BANK TRANSFERS'],
      ['Date', 'From', 'To', 'Amount', 'Note'],
      ...dailyTransfers.map((tr) => [tr.date, tr.from, tr.to, tr.amount, tr.note || '']),
    ];

    downloadCSV(`Daily-Report-${selectedDate}.csv`, rows);
  };

  const renderReportDocument = () => (
    <div ref={reportRef} className="printable-document w-full bg-white rounded-xl shadow-xs overflow-hidden">
      <ExcelReportView
        reportType="Daily"
        periodTitle={`${formattedSelectedDate} (${dayName})`}
        businessProfile={businessProfile}
        currencySymbol={currency}
        totalSale={dailyTotalSales}
        totalExpense={dailyTotalExpenses}
        availableMoney={totalAvailableBalance}
        cashBalance={closingCashBalance}
        bankBalance={closingBankBalance}
        transactions={activeDailyTx}
        expenses={dailyExpenses}
        closingCash={closingCashBalance}
        closingBank={closingBankBalance}
      />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header bar & Action Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Daily Financial Report</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete transaction-level audit: Sales, Payments Received, Pending Receivables, and Expenses.
          </p>
        </div>

        {/* Date Selector & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => changeDateByDays(-1)}
            title="Navigate to Previous Day (Ctrl+Left)"
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Previous Day</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(getLocalAccountingDate())}
            title="Jump to Today's Report (Ctrl+T)"
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition flex items-center gap-1 cursor-pointer ${
              selectedDate === currentLocalToday
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs'
            }`}
          >
            <span>TODAY</span>
            {selectedDate === currentLocalToday && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => changeDateByDays(1)}
            title="Navigate to Next Day (Ctrl+Right)"
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next Day</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 hidden sm:block" />

          <div className="flex items-center gap-2 px-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            />
            <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400 font-mono hidden md:inline">
              ({dayName})
            </span>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Print Preview</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>SAVE AS PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-200 dark:text-white" />
            <span>PRINT REPORT</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Summary Cards on Screen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Daily Sales</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(dailyTotalSales, currency)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200">{activeDailyTx.length} Invoices</span>
              {voidedDailyTx.length > 0 && (
                <span className="text-[10px] text-red-500 dark:text-red-400 font-semibold">({voidedDailyTx.length} Voided)</span>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Pending Created:</span>
            <strong className="text-amber-700 dark:text-amber-400 font-bold">{formatCurrency(dailyTotalPending, currency)}</strong>
          </div>
        </div>

        {/* Card 2: Received Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Revenue Collected</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400">{formatCurrency(dailyTotalReceived, currency)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Cash: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(dailyCashReceived, currency)}</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Bank / Digital:</span>
            <strong className="text-blue-700 dark:text-blue-400 font-bold">{formatCurrency(dailyBankReceived, currency)}</strong>
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Daily Expenses</span>
            <div className="p-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400">{formatCurrency(dailyTotalExpenses, currency)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              {dailyExpenses.length} Expense entries
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Cash: {formatCurrency(dailyCashExpenses, currency)}</span>
            <span className="text-slate-500 dark:text-slate-400">Bank: {formatCurrency(dailyBankExpenses, currency)}</span>
          </div>
        </div>

        {/* Card 4: Net Daily Cash Flow */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Net Cash Collections</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black ${netTotalDailyCollections >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(netTotalDailyCollections, currency)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Revenue minus Expenses
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Gross Operating:</span>
            <strong className={`font-bold ${grossDailyOperatingResult >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(grossDailyOperatingResult, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Embedded Document / Tables Section */}
      <div className="bg-slate-100/70 dark:bg-slate-950/60 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        {renderReportDocument()}
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        orientation="landscape"
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Daily Report - ${formattedSelectedDate}`}
        filename={filename}
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
        documentType="Daily Financial Report"
        pageCount={1}
      >
        {renderReportDocument()}
      </PrintPreviewModal>
    </div>
  );
};
