import React, { useRef, useState } from 'react';
import { MonthFile, Transaction, Expense, CashBankTransfer, BusinessProfile } from '../types';
import {
  calculateMonthTotals,
  formatDate,
  getDayName,
  formatCurrency,
  downloadCSV,
  getLocalAccountingYear,
  formatDateTimeLocal,
  getSystemTimeZone,
} from '../lib/utils';
import {
  FileBarChart,
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
  Receipt,
  Calendar,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { sanitizeFilename } from '../lib/pdf';
import { generateExcelReportPdf } from '../lib/excelReportPdf';
import { ExcelReportView } from './ExcelReportView';
import { triggerNativeWindowsPrint } from '../lib/print';
import { PrintPreviewModal } from './PrintPreviewModal';

interface MonthlyReportProps {
  monthFile: MonthFile | undefined;
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({
  monthFile,
  transactions,
  expenses,
  transfers,
  businessProfile,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currency = businessProfile?.currencySymbol || '$';
  const timeZone = getSystemTimeZone();
  const monthId = monthFile?.id || '';

  const totals = calculateMonthTotals(monthId, transactions, expenses, transfers, monthFile);

  const monthTx = transactions.filter((t) => t.monthId === monthId);
  const activeMonthTx = monthTx.filter((t) => !t.isVoided && t.status !== 'voided');
  const voidedMonthTx = monthTx.filter((t) => t.isVoided || t.status === 'voided');

  const monthExp = expenses.filter((e) => e.monthId === monthId);
  const monthTransfers = transfers.filter((tr) => tr.monthId === monthId);

  // Invoices with payments received in this month
  const paymentsReceivedList = activeMonthTx.filter((t) => t.totalReceived > 0);
  // Invoices with pending balances in this month
  const pendingInvoicesList = activeMonthTx.filter((t) => t.pendingAmount > 0);

  // Group Expenses by Category
  const expenseByCategory: Record<string, number> = {};
  monthExp.forEach((e) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  const categoryPieData = Object.entries(expenseByCategory).map(([cat, amt]) => ({
    name: cat,
    value: amt,
  }));

  const COLORS = ['#2563eb', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#64748b'];

  // Day by day aggregation for the month
  const dailyBreakdownMap: Record<
    string,
    {
      date: string;
      day: string;
      invoicesCount: number;
      sales: number;
      cashRec: number;
      bankRec: number;
      totalRec: number;
      pending: number;
      expenses: number;
    }
  > = {};

  activeMonthTx.forEach((tx) => {
    if (!dailyBreakdownMap[tx.date]) {
      dailyBreakdownMap[tx.date] = {
        date: tx.date,
        day: tx.day || getDayName(tx.date),
        invoicesCount: 0,
        sales: 0,
        cashRec: 0,
        bankRec: 0,
        totalRec: 0,
        pending: 0,
        expenses: 0,
      };
    }
    dailyBreakdownMap[tx.date].invoicesCount += 1;
    dailyBreakdownMap[tx.date].sales += tx.grandTotal;
    dailyBreakdownMap[tx.date].cashRec += tx.cashReceived;
    dailyBreakdownMap[tx.date].bankRec += tx.bankReceived;
    dailyBreakdownMap[tx.date].totalRec += tx.totalReceived;
    dailyBreakdownMap[tx.date].pending += tx.pendingAmount;
  });

  monthExp.forEach((exp) => {
    if (!dailyBreakdownMap[exp.date]) {
      dailyBreakdownMap[exp.date] = {
        date: exp.date,
        day: exp.day || getDayName(exp.date),
        invoicesCount: 0,
        sales: 0,
        cashRec: 0,
        bankRec: 0,
        totalRec: 0,
        pending: 0,
        expenses: 0,
      };
    }
    dailyBreakdownMap[exp.date].expenses += exp.amount;
  });

  const dailyBreakdownList = Object.values(dailyBreakdownMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const monthName = monthFile?.monthName || 'Current Month';
  const year = monthFile?.year || getLocalAccountingYear();
  const filename = sanitizeFilename(`Monthly-Report-${monthName}-${year}.pdf`);

  const handlePrint = () => {
    setToast(null);
    triggerNativeWindowsPrint({
      title: `Monthly Report - ${monthName} ${year}`,
      landscape: true,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
  };

  const handleDownloadPDF = async () => {
    setToast(null);
    const result = await generateExcelReportPdf(
      {
        reportType: 'Monthly',
        periodTitle: `${monthName} ${year}`,
        businessProfile,
        currencySymbol: currency,
        totalSale: totals.totalSales,
        totalExpense: totals.totalExpenses,
        availableMoney: totals.totalAvailableBalance,
        cashBalance: totals.cashBalance,
        bankBalance: totals.bankBalance,
        transactions: monthTx,
        expenses: monthExp,
        closingCash: totals.cashBalance,
        closingBank: totals.bankBalance,
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
      ['Monthly Financial Audit Report', `${monthName} ${year}`],
      ['Business Name', businessProfile?.name || ''],
      ['Generated On', formatDateTimeLocal()],
      ['Timezone', timeZone],
      [],
      ['SECTION A — FINANCIAL SUMMARY'],
      ['Total Sales Generated', totals.totalSales],
      ['Total Received', totals.totalReceived],
      ['Total Pending Receivables', totals.totalPending],
      ['Total Expenses', totals.totalExpenses],
      ['Cash Received', totals.cashReceived],
      ['Bank Received', totals.bankReceived],
      ['Cash Expenses', totals.cashExpenses],
      ['Bank Expenses', totals.bankExpenses],
      ['Opening Cash Balance', totals.openingCash],
      ['Closing Cash Balance', totals.cashBalance],
      ['Opening Bank Balance', totals.openingBank],
      ['Closing Bank Balance', totals.bankBalance],
      ['Total Available Balance', totals.totalAvailableBalance],
      ['Number of Invoices', totals.invoiceCount],
      ['Number of Expenses', totals.expenseCount],
      ['Gross Operating Result (Sales - Expenses)', totals.grossOperatingResult],
      ['Net Cash Flow (Received - Expenses)', totals.totalReceived - totals.totalExpenses],
      [],
      ['SECTION B.1 — DAY-BY-DAY BREAKDOWN'],
      ['Date', 'Day', 'Invoices', 'Sales', 'Cash Rec', 'Bank Rec', 'Total Rec', 'Pending', 'Expenses', 'Net Flow'],
      ...dailyBreakdownList.map((d) => [
        d.date,
        d.day,
        d.invoicesCount,
        d.sales,
        d.cashRec,
        d.bankRec,
        d.totalRec,
        d.pending,
        d.expenses,
        d.totalRec - d.expenses,
      ]),
      [],
      ['SECTION B.2 — SALES & INVOICES REGISTER'],
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
        'Status',
      ],
      ...monthTx.map((tx) => [
        tx.invoiceNumber,
        tx.date,
        tx.day || getDayName(tx.date),
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
        tx.isVoided || tx.status === 'voided' ? 'Voided' : tx.pendingAmount === 0 ? 'Paid' : 'Partial/Pending',
      ]),
      [],
      ['SECTION B.3 — PAYMENTS RECEIVED DETAILS'],
      ['Invoice #', 'Payment Date', 'Customer', 'Invoice Total', 'Cash Received', 'Bank Received', 'Total Received', 'Remaining Pending', 'Method'],
      ...paymentsReceivedList.map((tx) => [
        tx.invoiceNumber,
        tx.date,
        tx.customerName,
        tx.grandTotal,
        tx.cashReceived,
        tx.bankReceived,
        tx.totalReceived,
        tx.pendingAmount,
        tx.paymentMethod,
      ]),
      [],
      ['SECTION B.4 — OUTSTANDING PENDING DETAILS'],
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
      ['SECTION B.5 — EXPENSES LEDGER'],
      ['Voucher #', 'Date', 'Day', 'Category', 'Title / Description', 'Made By', 'Payment Method', 'Cash Expense', 'Bank Expense', 'Total Amount'],
      ...monthExp.map((e) => [
        e.voucherNumber || `EXP-${e.date.slice(0, 4)}-0001`,
        e.date,
        e.day || getDayName(e.date),
        e.category,
        `${e.title}${e.description ? ` (${e.description})` : ''}`,
        e.madeBy || '-',
        e.paymentSource,
        e.paymentSource === 'Cash' ? e.amount : 0,
        e.paymentSource === 'Bank' ? e.amount : 0,
        e.amount,
      ]),
    ];

    downloadCSV(`Monthly-Report-${monthName}-${year}.csv`, rows);
  };

  const renderReportDocument = () => (
    <div ref={reportRef} className="printable-document w-full bg-white rounded-xl shadow-xs overflow-hidden">
      <ExcelReportView
        reportType="Monthly"
        periodTitle={`${monthName} ${year}`}
        businessProfile={businessProfile}
        currencySymbol={currency}
        totalSale={totals.totalSales}
        totalExpense={totals.totalExpenses}
        availableMoney={totals.totalAvailableBalance}
        cashBalance={totals.cashBalance}
        bankBalance={totals.bankBalance}
        transactions={monthTx}
        expenses={monthExp}
        closingCash={totals.cashBalance}
        closingBank={totals.bankBalance}
      />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-white hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Monthly Financial Audit Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Month: <strong className="text-slate-800 dark:text-slate-200">{monthName} {year}</strong> • Complete transaction-level report
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Print Preview</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-200 dark:text-white" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>SAVE AS PDF</span>
          </button>
        </div>
      </div>

      {/* Main Document View */}
      {renderReportDocument()}

      {/* Print Preview Overlay */}
      <PrintPreviewModal
        orientation="landscape"
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Monthly Report - ${monthName} ${year}`}
        filename={filename}
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
        documentType="Monthly Financial Report"
        pageCount={1}
      >
        {renderReportDocument()}
      </PrintPreviewModal>
    </div>
  );
};
