import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MonthFile, Transaction, Expense, CashBankTransfer, BusinessProfile } from '../types';
import {
  calculateMonthTotals,
  formatCurrency,
  downloadCSV,
  getLocalAccountingYear,
  formatDateTimeLocal,
  getSystemTimeZone,
} from '../lib/utils';
import {
  BarChart3,
  Printer,
  Download,
  FileSpreadsheet,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building,
  Wallet,
  Coins,
  Receipt,
  Scale,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { sanitizeFilename } from '../lib/pdf';
import { generateYearlyReportPdf, MonthSummaryItem } from '../lib/yearlyReportPdf';
import { triggerNativeWindowsPrint } from '../lib/print';
import { PrintPreviewModal } from './PrintPreviewModal';

interface YearlyReportProps {
  months: MonthFile[];
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const YearlyReport: React.FC<YearlyReportProps> = ({
  months,
  transactions,
  expenses,
  transfers,
  businessProfile,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currency = businessProfile?.currencySymbol || 'Rs. ';
  const timeZone = getSystemTimeZone();
  const currentActualYear = getLocalAccountingYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentActualYear);

  // Keyboard shortcut listener for year change (Ctrl+Shift+Up / Ctrl+Shift+Down)
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

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedYear((prev) => prev - 1);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedYear((prev) => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute 12-Month Management Data dynamically
  const yearData: MonthSummaryItem[] = useMemo(() => {
    return MONTH_NAMES.map((mName, idx) => {
      const monthNum = idx + 1;
      const mId = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
      const mFile = months.find((m) => m.id === mId);

      const totals = calculateMonthTotals(mId, transactions, expenses, transfers, mFile);

      return {
        monthNumber: monthNum,
        monthName: mName,
        monthId: mId,
        sales: totals.totalSales,
        received: totals.totalReceived,
        pending: totals.totalPending,
        expenses: totals.totalExpenses,
        cashReceived: totals.cashReceived,
        bankReceived: totals.bankReceived,
        cashExpenses: totals.cashExpenses,
        bankExpenses: totals.bankExpenses,
        grossProfit: totals.grossOperatingResult,
      };
    });
  }, [selectedYear, months, transactions, expenses, transfers]);

  // Aggregate Annual Totals
  const totalAnnualSales = useMemo(() => yearData.reduce((sum, d) => sum + d.sales, 0), [yearData]);
  const totalReceived = useMemo(() => yearData.reduce((sum, d) => sum + d.received, 0), [yearData]);
  const totalPending = useMemo(() => yearData.reduce((sum, d) => sum + d.pending, 0), [yearData]);
  const totalAnnualExpenses = useMemo(() => yearData.reduce((sum, d) => sum + d.expenses, 0), [yearData]);

  const totalCashReceived = useMemo(() => yearData.reduce((sum, d) => sum + d.cashReceived, 0), [yearData]);
  const totalBankReceived = useMemo(() => yearData.reduce((sum, d) => sum + d.bankReceived, 0), [yearData]);
  const totalCashExpenses = useMemo(() => yearData.reduce((sum, d) => sum + d.cashExpenses, 0), [yearData]);
  const totalBankExpenses = useMemo(() => yearData.reduce((sum, d) => sum + d.bankExpenses, 0), [yearData]);

  const netCashMovement = totalCashReceived - totalCashExpenses;
  const netBankMovement = totalBankReceived - totalBankExpenses;

  // Profit / Net Operating Result (Sales - Expenses)
  const netProfit = totalAnnualSales - totalAnnualExpenses;
  const profitMargin = totalAnnualSales > 0 ? (netProfit / totalAnnualSales) * 100 : 0;
  const netCashFlow = totalReceived - totalAnnualExpenses;

  // Current Closing Cash and Bank Balances
  // Calculate latest active month or full-year cumulative position
  const activeMonths = yearData.filter((d) => d.sales > 0 || d.expenses > 0 || d.received > 0);
  const targetMonthNum = activeMonths.length > 0 ? activeMonths[activeMonths.length - 1].monthNumber : 12;
  const targetMonthId = `${selectedYear}-${String(targetMonthNum).padStart(2, '0')}`;
  const targetMonthFile = months.find((m) => m.id === targetMonthId);
  const latestMonthTotals = calculateMonthTotals(targetMonthId, transactions, expenses, transfers, targetMonthFile);

  const cashBalance = latestMonthTotals.cashBalance;
  const bankBalance = latestMonthTotals.bankBalance;
  const totalAvailableMoney = cashBalance + bankBalance;

  // Yearly Performance Highlights Calculation
  const highlights = useMemo(() => {
    // Highest Sales
    let highestSales = { month: 'None', amount: 0 };
    let lowestSales = { month: 'None', amount: Infinity };
    let highestExpense = { month: 'None', amount: 0 };

    yearData.forEach((d) => {
      if (d.sales > highestSales.amount) {
        highestSales = { month: d.monthName, amount: d.sales };
      }
      if (d.sales < lowestSales.amount) {
        lowestSales = { month: d.monthName, amount: d.sales };
      }
      if (d.expenses > highestExpense.amount) {
        highestExpense = { month: d.monthName, amount: d.expenses };
      }
    });

    if (lowestSales.amount === Infinity) {
      lowestSales = { month: 'None', amount: 0 };
    }

    const avgMonthlySales = totalAnnualSales / 12;
    const avgMonthlyExpenses = totalAnnualExpenses / 12;

    return {
      highestSalesMonth: highestSales.month,
      highestSalesAmount: highestSales.amount,
      lowestSalesMonth: lowestSales.month,
      lowestSalesAmount: lowestSales.amount,
      highestExpenseMonth: highestExpense.month,
      highestExpenseAmount: highestExpense.amount,
      avgMonthlySales,
      avgMonthlyExpenses,
    };
  }, [yearData, totalAnnualSales, totalAnnualExpenses]);

  // Chart Formatting Data (Short Month Names)
  const chartData = useMemo(() => {
    return yearData.map((d) => ({
      month: d.monthName.slice(0, 3),
      fullName: d.monthName,
      sales: d.sales,
      expenses: d.expenses,
      received: d.received,
      pending: d.pending,
      profit: d.grossProfit,
    }));
  }, [yearData]);

  const filename = sanitizeFilename(`Annual-Management-Report-${selectedYear}.pdf`);

  // Handle Print
  const handlePrint = () => {
    setToast(null);
    triggerNativeWindowsPrint({
      title: `Annual Financial Management Report - ${selectedYear}`,
      landscape: true,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
  };

  // Handle Save As PDF
  const handleDownloadPDF = async () => {
    setToast(null);
    const result = await generateYearlyReportPdf(
      {
        year: selectedYear,
        businessProfile,
        currencySymbol: currency,
        totalAnnualSales,
        totalAnnualExpenses,
        totalReceived,
        totalPending,
        cashBalance,
        bankBalance,
        totalAvailableMoney,
        totalCashReceived,
        totalCashExpenses,
        netCashMovement,
        totalBankReceived,
        totalBankExpenses,
        netBankMovement,
        netProfit,
        highestSalesMonth: highlights.highestSalesMonth,
        highestSalesAmount: highlights.highestSalesAmount,
        lowestSalesMonth: highlights.lowestSalesMonth,
        lowestSalesAmount: highlights.lowestSalesAmount,
        highestExpenseMonth: highlights.highestExpenseMonth,
        highestExpenseAmount: highlights.highestExpenseAmount,
        avgMonthlySales: highlights.avgMonthlySales,
        avgMonthlyExpenses: highlights.avgMonthlyExpenses,
        monthlyData: yearData,
      },
      filename
    );

    if (result.success) {
      setToast({ type: 'success', message: result.message });
    } else if (!result.cancelled) {
      setToast({ type: 'error', message: result.message });
    }
  };

  // Handle Export CSV (Clean Management Summary Only)
  const handleExportCSV = () => {
    const rows: (string | number)[][] = [
      ['ANNUAL FINANCIAL MANAGEMENT REPORT', selectedYear],
      ['Business Name', businessProfile?.name || 'LedgerPro Accounting'],
      ['Generated On', formatDateTimeLocal()],
      ['Timezone', timeZone],
      [],
      ['1. TOP ANNUAL FINANCIAL TOTALS'],
      ['Total Annual Sales', totalAnnualSales],
      ['Total Annual Expenses', totalAnnualExpenses],
      ['Total Received', totalReceived],
      ['Total Pending', totalPending],
      ['Cash Balance', cashBalance],
      ['Account / Bank Balance', bankBalance],
      ['Total Available Money', totalAvailableMoney],
      ['Net Profit / Result (Sales - Expenses)', netProfit],
      ['Net Annual Cash Flow (Received - Expenses)', netCashFlow],
      [],
      ['2. MONTHLY FINANCIAL SUMMARY (12 MONTHS)'],
      [
        'Month',
        'Total Sales',
        'Total Received',
        'Total Pending',
        'Total Expenses',
        'Cash Received',
        'Bank Received',
        'Cash Expenses',
        'Bank Expenses',
        'Net Operating Result',
      ],
      ...yearData.map((d) => [
        d.monthName,
        d.sales,
        d.received,
        d.pending,
        d.expenses,
        d.cashReceived,
        d.bankReceived,
        d.cashExpenses,
        d.bankExpenses,
        d.grossProfit,
      ]),
      [
        'YEAR TOTAL',
        totalAnnualSales,
        totalReceived,
        totalPending,
        totalAnnualExpenses,
        totalCashReceived,
        totalBankReceived,
        totalCashExpenses,
        totalBankExpenses,
        netProfit,
      ],
      [],
      ['3. YEARLY CASH & BANK SUMMARY'],
      ['Total Cash Received', totalCashReceived],
      ['Total Cash Expenses', totalCashExpenses],
      ['Net Cash Movement', netCashMovement],
      ['Total Bank Received', totalBankReceived],
      ['Total Bank Expenses', totalBankExpenses],
      ['Net Bank Movement', netBankMovement],
      ['Current Cash Balance', cashBalance],
      ['Current Bank Balance', bankBalance],
      ['Total Available Money', totalAvailableMoney],
      [],
      ['4. PERFORMANCE HIGHLIGHTS'],
      ['Highest Sales Month', `${highlights.highestSalesMonth} (${highlights.highestSalesAmount})`],
      ['Lowest Sales Month', `${highlights.lowestSalesMonth} (${highlights.lowestSalesAmount})`],
      ['Highest Expense Month', `${highlights.highestExpenseMonth} (${highlights.highestExpenseAmount})`],
      ['Average Monthly Sales', highlights.avgMonthlySales.toFixed(2)],
      ['Average Monthly Expenses', highlights.avgMonthlyExpenses.toFixed(2)],
    ];

    downloadCSV(`Annual-Management-Summary-${selectedYear}.csv`, rows);
  };

  // Custom Chart Tooltip Formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-700 space-y-1">
          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold">{formatCurrency(entry.value, currency)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Report Content Layout
  const renderReportContent = () => (
    <div
      ref={reportRef}
      id="yearly-management-report-document"
      className="printable-document w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-8 print:border-none print:shadow-none print:p-0 print:space-y-6"
    >
      {/* -------------------------------------------------------------
          1. BUSINESS HEADER & REPORT TITLE
      ------------------------------------------------------------- */}
      <div className="border-b-2 border-slate-800 dark:border-slate-700 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {businessProfile?.logoUrl && (
            <img
              src={businessProfile.logoUrl}
              alt="Logo"
              className="w-12 h-12 object-contain rounded-lg border border-slate-200 dark:border-slate-700 p-1"
            />
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              {businessProfile?.name || 'LedgerPro Accounting & Invoicing'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {[
                businessProfile?.address,
                businessProfile?.phone ? `Tel: ${businessProfile.phone}` : null,
                businessProfile?.taxRegistrationNumber
                  ? `NTN/TRN: ${businessProfile.taxRegistrationNumber}`
                  : null,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <div className="inline-block bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-xs px-3.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
            ANNUAL MANAGEMENT FINANCIAL SUMMARY
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5">
            Accounting Year: <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{selectedYear}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Generated: {formatDateTimeLocal(new Date().toISOString())} ({timeZone})
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. TOP YEARLY SUMMARY (7 Prominent Financial Figures)
      ------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Top Yearly Financial Overview
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Year {selectedYear}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* TOTAL ANNUAL SALES */}
          <div
            id="card-yearly-sales"
            className="border-2 border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl p-3.5 text-center flex flex-col justify-between shadow-2xs"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800/60 pb-1.5">
              TOTAL ANNUAL SALES
            </div>
            <div className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-400 font-mono my-1.5">
              {formatCurrency(totalAnnualSales, currency)}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">12-Month Invoiced</div>
          </div>

          {/* TOTAL ANNUAL EXPENSES */}
          <div
            id="card-yearly-expenses"
            className="border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl p-3.5 text-center flex flex-col justify-between shadow-2xs"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-rose-900 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800/60 pb-1.5">
              TOTAL ANNUAL EXPENSES
            </div>
            <div className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-400 font-mono my-1.5">
              {formatCurrency(totalAnnualExpenses, currency)}
            </div>
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">12-Month Outflow</div>
          </div>

          {/* TOTAL RECEIVED */}
          <div
            id="card-yearly-received"
            className="border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl p-3.5 text-center flex flex-col justify-between shadow-2xs"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800/60 pb-1.5">
              TOTAL RECEIVED
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono my-1.5">
              {formatCurrency(totalReceived, currency)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Collected Revenue</div>
          </div>

          {/* TOTAL PENDING */}
          <div
            id="card-yearly-pending"
            className="border-2 border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl p-3.5 text-center flex flex-col justify-between shadow-2xs"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800/60 pb-1.5">
              TOTAL PENDING
            </div>
            <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 font-mono my-1.5">
              {formatCurrency(totalPending, currency)}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Outstanding Balance</div>
          </div>

          {/* CASH BALANCE */}
          <div
            id="card-yearly-cash"
            className="border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 text-center flex flex-col justify-between shadow-2xs"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3 text-slate-600 dark:text-slate-400" /> CASH BALANCE
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono my-1.5">
              {formatCurrency(cashBalance, currency)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">In-Hand Cash</div>
          </div>

          {/* ACCOUNT / BANK BALANCE */}
          <div
            id="card-yearly-bank"
            className="border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 text-center flex flex-col justify-between shadow-2xs"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-center gap-1">
              <Building className="w-3 h-3 text-slate-600 dark:text-slate-400" /> BANK BALANCE
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono my-1.5">
              {formatCurrency(bankBalance, currency)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Account Funds</div>
          </div>

          {/* TOTAL AVAILABLE MONEY */}
          <div
            id="card-yearly-available"
            className="border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-100/70 dark:bg-emerald-950/50 rounded-xl p-3.5 text-center flex flex-col justify-between shadow-2xs col-span-2 sm:col-span-3 lg:col-span-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 border-b border-emerald-300 dark:border-emerald-800 pb-1.5 flex items-center justify-center gap-1">
              <Coins className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> AVAILABLE MONEY
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono my-1.5">
              {formatCurrency(totalAvailableMoney, currency)}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Total Liquidity</div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. MONTHLY FINANCIAL SUMMARY (Excel-Style Table)
      ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="bg-slate-800 dark:bg-slate-950 text-white px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>MONTHLY FINANCIAL SUMMARY</span>
          </div>
          <span className="text-[11px] font-normal text-slate-300">
            All 12 Months Performance Table
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-slate-300 dark:border-slate-700 rounded-b-xl">
          <table className="w-full text-left text-xs border-collapse font-sans bg-white dark:bg-slate-900">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold uppercase text-[10px] border-b-2 border-slate-400 dark:border-slate-600">
              <tr>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3">Month</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-right">Total Sales</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-right">Total Received</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-right">Total Pending</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-right">Total Expenses</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-right">Cash Received</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-right">Bank Received</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-right">Cash Expenses</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-3 text-right">Bank Expenses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {yearData.map((m) => (
                <tr
                  key={m.monthNumber}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {m.monthName}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {formatCurrency(m.sales, currency)}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(m.received, currency)}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right font-mono font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {formatCurrency(m.pending, currency)}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right font-mono font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                    {formatCurrency(m.expenses, currency)}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatCurrency(m.cashReceived, currency)}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatCurrency(m.bankReceived, currency)}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatCurrency(m.cashExpenses, currency)}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatCurrency(m.bankExpenses, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black border-t-2 border-slate-400 dark:border-slate-600">
              <tr>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 uppercase tracking-wider text-xs font-black">
                  YEAR TOTAL
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 text-right font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap text-xs">
                  {formatCurrency(totalAnnualSales, currency)}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap text-xs">
                  {formatCurrency(totalReceived, currency)}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-400 whitespace-nowrap text-xs">
                  {formatCurrency(totalPending, currency)}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 text-right font-mono text-rose-700 dark:text-rose-400 whitespace-nowrap text-xs">
                  {formatCurrency(totalAnnualExpenses, currency)}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 text-right font-mono whitespace-nowrap text-xs">
                  {formatCurrency(totalCashReceived, currency)}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 text-right font-mono whitespace-nowrap text-xs">
                  {formatCurrency(totalBankReceived, currency)}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 text-right font-mono whitespace-nowrap text-xs">
                  {formatCurrency(totalCashExpenses, currency)}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-3 px-3 text-right font-mono whitespace-nowrap text-xs">
                  {formatCurrency(totalBankExpenses, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------
          4. PROFIT / NET MOVEMENT & YEARLY PERFORMANCE HIGHLIGHTS
      ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PROFIT & NET RESULT */}
        <div
          id="section-yearly-profit"
          className="border-2 border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Yearly Financial Performance & Profit
            </h3>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                netProfit >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {profitMargin.toFixed(1)}% Margin
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">TOTAL ANNUAL SALES</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(totalAnnualSales, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">TOTAL ANNUAL EXPENSES</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(totalAnnualExpenses, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 bg-white dark:bg-slate-800 px-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="font-black text-slate-900 dark:text-white text-xs">NET PROFIT / NET RESULT</span>
              <span
                className={`font-mono font-black text-sm ${
                  netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(netProfit, currency)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              * Calculated strictly using standard accounting logic: <strong>Sales − Expenses</strong>. Pending invoices are fully accounted in total annual sales.
            </p>
          </div>
        </div>

        {/* PERFORMANCE HIGHLIGHTS */}
        <div
          id="section-yearly-highlights"
          className="border-2 border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Yearly Performance Highlights
            </h3>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Year {selectedYear}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                Highest Sales Month
              </span>
              <span className="font-extrabold text-blue-700 dark:text-blue-400 block mt-0.5">
                {highlights.highestSalesMonth}
              </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                {formatCurrency(highlights.highestSalesAmount, currency)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                Lowest Sales Month
              </span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block mt-0.5">
                {highlights.lowestSalesMonth}
              </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                {formatCurrency(highlights.lowestSalesAmount, currency)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                Highest Expense Month
              </span>
              <span className="font-extrabold text-rose-700 dark:text-rose-400 block mt-0.5">
                {highlights.highestExpenseMonth}
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                {formatCurrency(highlights.highestExpenseAmount, currency)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                Monthly Averages
              </span>
              <span className="text-slate-600 dark:text-slate-300 text-[11px] block mt-0.5">
                Avg Sales: <strong className="font-mono text-blue-700 dark:text-blue-400">{formatCurrency(highlights.avgMonthlySales, currency)}</strong>
              </span>
              <span className="text-slate-600 dark:text-slate-300 text-[11px] block">
                Avg Exp: <strong className="font-mono text-rose-600 dark:text-rose-400">{formatCurrency(highlights.avgMonthlyExpenses, currency)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          5. YEARLY CASH & BANK SUMMARY TABLE
      ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="bg-slate-800 dark:bg-slate-950 text-white px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-400" />
            <span>YEARLY CASH & BANK MOVEMENTS & CLOSING BALANCES</span>
          </div>
          <span className="text-[11px] font-normal text-slate-300">
            Actual Liquidity & Movement Register
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-slate-300 dark:border-slate-700 rounded-b-xl">
          <table className="w-full text-left text-xs border-collapse font-sans bg-white dark:bg-slate-900">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold uppercase text-[10px] border-b-2 border-slate-400 dark:border-slate-600">
              <tr>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-4 w-2/3">Category / Metric</th>
                <th className="border border-slate-300 dark:border-slate-700 py-2.5 px-4 text-right w-1/3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Total Cash Received
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalCashReceived, currency)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Total Cash Expenses
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 text-right font-mono font-bold text-rose-700 dark:text-rose-400">
                  {formatCurrency(totalCashExpenses, currency)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 font-bold text-slate-900 dark:text-white">
                  Net Cash Movement
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                  {formatCurrency(netCashMovement, currency)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Total Bank Received
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalBankReceived, currency)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Total Bank Expenses
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 text-right font-mono font-bold text-rose-700 dark:text-rose-400">
                  {formatCurrency(totalBankExpenses, currency)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 font-bold text-slate-900 dark:text-white">
                  Net Bank Movement
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                  {formatCurrency(netBankMovement, currency)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 font-bold text-slate-800 dark:text-slate-200">
                  Current Cash Balance
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(cashBalance, currency)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 font-bold text-slate-800 dark:text-slate-200">
                  Current Bank Balance
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(bankBalance, currency)}
                </td>
              </tr>
              <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-black">
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-4 font-black text-emerald-900 dark:text-emerald-300 uppercase">
                  Total Available Money
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-4 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                  {formatCurrency(totalAvailableMoney, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------
          6. FOUR GRAPHICAL CHARTS (Management Analysis)
      ------------------------------------------------------------- */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Annual Graphical Performance Analysis
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Interactive Visualizations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* CHART 1: MONTHLY SALES */}
          <div
            id="chart-monthly-sales"
            className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Monthly Sales
              </h4>
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                Total: {formatCurrency(totalAnnualSales, currency)}
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 2: MONTHLY EXPENSES */}
          <div
            id="chart-monthly-expenses"
            className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Monthly Expenses
              </h4>
              <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                Total: {formatCurrency(totalAnnualExpenses, currency)}
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="expenses" name="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 3: SALES VS EXPENSES (Comparison) */}
          <div
            id="chart-sales-vs-expenses"
            className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Sales vs Expenses
              </h4>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Net: {formatCurrency(netProfit, currency)}
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#e11d48" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 4: RECEIVED VS PENDING (Collection Comparison) */}
          <div
            id="chart-received-vs-pending"
            className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Received vs Pending
              </h4>
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                Pending: {formatCurrency(totalPending, currency)}
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="received" name="Received" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
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
          <button onClick={() => setToast(null)} className="text-white hover:opacity-80 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          TOP ACTION BAR: YEAR SELECTOR & EXPORT BUTTONS
      ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" /> Annual Financial Summary (Yearly Report)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Management overview showing 12-month performance, annual liquidity, and graphical trends for Year {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Selection Controls */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
            <button
              id="btn-prev-year"
              type="button"
              onClick={() => setSelectedYear((prev) => prev - 1)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="Previous Year (Ctrl+Shift+Up)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous Year</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold text-blue-700 dark:text-blue-400 border-x border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5" />
              <select
                id="select-year-dropdown"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent font-black text-slate-900 dark:text-white outline-none cursor-pointer text-sm"
              >
                {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-current-year"
              type="button"
              onClick={() => setSelectedYear(currentActualYear)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedYear === currentActualYear
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Jump to Current Year"
            >
              CURRENT YEAR
            </button>

            <button
              id="btn-next-year"
              type="button"
              onClick={() => setSelectedYear((prev) => prev + 1)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="Next Year (Ctrl+Shift+Down)"
            >
              <span className="hidden sm:inline">Next Year</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            id="btn-print-preview"
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Print Preview</span>
          </button>

          <button
            id="btn-print-report"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-200" />
            <span>Print Report</span>
          </button>

          <button
            id="btn-save-as-pdf"
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>SAVE AS PDF</span>
          </button>
        </div>
      </div>

      {/* Main Report Render Area */}
      {renderReportContent()}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        orientation="landscape"
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Annual Financial Management Report - ${selectedYear}`}
        filename={filename}
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
        documentType="Yearly Management Report"
        pageCount={1}
      >
        {renderReportContent()}
      </PrintPreviewModal>
    </div>
  );
};
