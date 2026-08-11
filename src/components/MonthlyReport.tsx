import React, { useRef, useState } from 'react';
import { MonthFile, Transaction, Expense, CashBankTransfer, BusinessProfile } from '../types';
import { calculateMonthTotals, formatDate, formatCurrency, downloadCSV, getLocalAccountingYear, formatDateTimePKT } from '../lib/utils';
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
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { downloadPdfFromElement, sanitizeFilename } from '../lib/pdf';
import { triggerPrintDocument } from '../lib/print';
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
  const monthId = monthFile?.id || '';

  const totals = calculateMonthTotals(monthId, transactions, expenses, transfers, monthFile);

  const monthTx = transactions.filter((t) => t.monthId === monthId);
  const monthExp = expenses.filter((e) => e.monthId === monthId);

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

  const monthName = monthFile?.monthName || 'All';
  const year = monthFile?.year || getLocalAccountingYear();
  const filename = sanitizeFilename(`Monthly-Report-${monthName}-${year}.pdf`);

  const handlePrint = () => {
    setToast(null);
    const success = triggerPrintDocument({
      title: `Monthly Report - ${monthName} ${year}`,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
    if (success) {
      setToast({
        type: 'success',
        message: 'Monthly report sent to Windows printer spooler.',
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setToast(null);
    const result = await downloadPdfFromElement(reportRef.current, filename);
    if (result.success) {
      setToast({ type: 'success', message: result.message });
    } else if (!result.cancelled) {
      setToast({ type: 'error', message: result.message });
    }
  };

  const handleExportCSV = () => {
    const rows: (string | number)[][] = [
      ['Monthly Financial Report', `${monthName} ${year}`],
      ['Business Name', businessProfile?.name || ''],
      ['Generated On', formatDateTimePKT()],
      [],
      ['SALES SUMMARY'],
      ['Total Invoices Count', totals.invoiceCount],
      ['Total Sales', totals.totalSales],
      ['Total Received', totals.totalReceived],
      ['Total Pending Receivables', totals.totalPending],
      [],
      ['PAYMENT SUMMARY'],
      ['Cash Received', totals.cashReceived],
      ['Bank Received', totals.bankReceived],
      ['Cash Expenses', totals.cashExpenses],
      ['Bank Expenses', totals.bankExpenses],
      [],
      ['BALANCE STATEMENT'],
      ['Opening Cash', totals.openingCash],
      ['Closing Cash Balance', totals.cashBalance],
      ['Opening Bank', totals.openingBank],
      ['Closing Bank Balance', totals.bankBalance],
      ['Total Available Money', totals.totalAvailableBalance],
      [],
      ['PROFIT OVERVIEW'],
      ['Gross Operating Result (Sales - Expenses)', totals.grossOperatingResult],
      ['Net Cash Flow (Received - Expenses)', totals.totalReceived - totals.totalExpenses],
    ];

    downloadCSV(`Monthly-Report-${monthName}-${year}.csv`, rows);
  };

  const renderReportDocument = () => (
    <div ref={reportRef} className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8 font-sans printable-document" data-printable="true">
      {/* Report Top Branding Header */}
      <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start">
        <div className="flex items-start gap-4">
          {businessProfile?.logoUrl && (
            <img src={businessProfile.logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {businessProfile?.name || 'Business Accounting'}
            </h1>
            <p className="text-xs text-slate-600">{businessProfile?.address}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {businessProfile?.phone} • {businessProfile?.email}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="bg-slate-900 text-white text-xs font-bold uppercase px-3 py-1.5 rounded tracking-wider">
            OFFICIAL MONTHLY REPORT
          </span>
          <div className="text-lg font-bold text-slate-900 mt-2">
            {monthName} {year}
          </div>
          <div className="text-[11px] text-slate-500">
            Audit Date: {formatDateTimePKT()}
          </div>
        </div>
      </div>

      {/* 1. SALES SUMMARY */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" /> 1. Sales Summary
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Invoices</span>
            <strong className="text-xl font-bold text-slate-900 block mt-1">{totals.invoiceCount}</strong>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-800 uppercase block">Total Sales</span>
            <strong className="text-xl font-bold text-blue-900 block mt-1">
              {formatCurrency(totals.totalSales, currency)}
            </strong>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Total Money Received</span>
            <strong className="text-xl font-bold text-emerald-900 block mt-1">
              {formatCurrency(totals.totalReceived, currency)}
            </strong>
          </div>

          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-800 uppercase block">Pending Receivables</span>
            <strong className="text-xl font-bold text-amber-900 block mt-1">
              {formatCurrency(totals.totalPending, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* 2. EXPENSE SUMMARY & CATEGORY BREAKDOWN */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-rose-600" /> 2. Expense Summary & Category Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
              <span className="font-bold text-rose-900 text-xs uppercase">Total Monthly Expenses</span>
              <strong className="text-2xl font-bold text-rose-700">{formatCurrency(totals.totalExpenses, currency)}</strong>
            </div>

            {/* Table breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-right">% of Expense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryPieData.map((cat, i) => {
                    const pct = totals.totalExpenses > 0 ? (cat.value / totals.totalExpenses) * 100 : 0;
                    return (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{cat.name}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(cat.value, currency)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recharts Pie Chart */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-center items-center">
            <span className="text-xs font-bold text-slate-700 mb-2">Category Visual Distribution</span>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PAYMENT & BALANCE SUMMARY STATEMENT */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
          <Building className="w-4 h-4 text-emerald-600" /> 3. Payment & Cash / Bank Balance Statement
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cash Statement */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2 text-xs">
            <h3 className="font-bold text-emerald-800 text-sm border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" /> Cash Account Ledger
            </h3>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Opening Cash Balance:</span>
              <strong className="font-mono">{formatCurrency(totals.openingCash, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 text-emerald-700 border-b border-slate-100">
              <span>+ Cash Received (Sales):</span>
              <strong className="font-mono">{formatCurrency(totals.cashReceived, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 text-rose-600 border-b border-slate-100">
              <span>- Cash Expenses Paid:</span>
              <strong className="font-mono">{formatCurrency(totals.cashExpenses, currency)}</strong>
            </div>
            <div className="flex justify-between py-2 text-slate-900 font-extrabold text-sm border-t-2 border-slate-800 pt-2">
              <span>Closing Cash Balance:</span>
              <strong className="font-mono text-emerald-700">{formatCurrency(totals.cashBalance, currency)}</strong>
            </div>
          </div>

          {/* Bank Statement */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2 text-xs">
            <h3 className="font-bold text-blue-800 text-sm border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" /> Bank Account Ledger
            </h3>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Opening Bank Balance:</span>
              <strong className="font-mono">{formatCurrency(totals.openingBank, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 text-emerald-700 border-b border-slate-100">
              <span>+ Bank Received (Sales):</span>
              <strong className="font-mono">{formatCurrency(totals.bankReceived, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 text-rose-600 border-b border-slate-100">
              <span>- Bank Expenses Paid:</span>
              <strong className="font-mono">{formatCurrency(totals.bankExpenses, currency)}</strong>
            </div>
            <div className="flex justify-between py-2 text-slate-900 font-extrabold text-sm border-t-2 border-slate-800 pt-2">
              <span>Closing Bank Balance:</span>
              <strong className="font-mono text-blue-700">{formatCurrency(totals.bankBalance, currency)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PROFIT OVERVIEW & AUDIT VERIFICATION */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800 pb-2">
          4. Profit & Operating Audit Result
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Operating Result</span>
            <span className="text-xs text-slate-400 block mb-1">(Total Sales - Total Expenses)</span>
            <strong className="text-2xl font-black text-emerald-400 block">
              {formatCurrency(totals.grossOperatingResult, currency)}
            </strong>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Collected Cashflow</span>
            <span className="text-xs text-slate-400 block mb-1">(Total Received - Total Expenses)</span>
            <strong className="text-2xl font-black text-blue-400 block">
              {formatCurrency(totals.totalReceived - totals.totalExpenses, currency)}
            </strong>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Available Money</span>
            <span className="text-xs text-slate-400 block mb-1">(Cash Balance + Bank Balance)</span>
            <strong className="text-2xl font-black text-white block">
              {formatCurrency(totals.totalAvailableBalance, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Stamps & Signatures Footer */}
      <div className="pt-8 border-t border-slate-200 flex justify-between items-end avoid-page-break">
        <div>
          {businessProfile?.businessStampUrl ? (
            <div className="flex flex-col items-center">
              <img
                src={businessProfile.businessStampUrl}
                alt="Official Stamp"
                className="h-20 object-contain opacity-90"
              />
              <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">Official Stamp</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Report issued by {businessProfile?.name || 'LedgerPro Accounting'}
              <br />
              Generated on {formatDateTimePKT()}
            </div>
          )}
        </div>

        <div className="text-right">
          {businessProfile?.ceoSignatureUrl ? (
            <div className="flex flex-col items-end">
              <img
                src={businessProfile.ceoSignatureUrl}
                alt="CEO Signature"
                className="h-14 object-contain mb-1"
              />
              <div className="w-40 border-b border-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-900">{businessProfile.ceoName}</span>
              <span className="text-[10px] text-slate-500 uppercase">CEO / Authorized Signatory</span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <div className="w-40 border-b border-slate-400 mb-1 mt-8" />
              <span className="text-xs font-bold text-slate-900">
                {businessProfile?.ceoName || 'Authorized Signatory'}
              </span>
              <span className="text-[10px] text-slate-500 uppercase">CEO / Authorized Signatory</span>
            </div>
          )}
        </div>
      </div>
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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-blue-600" /> Monthly Financial Audit Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Month: <strong className="text-slate-800">{monthName} {year}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-blue-600" /> Print Preview
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> SAVE AS PDF
          </button>
        </div>
      </div>

      {/* Main Document View */}
      {renderReportDocument()}

      {/* Print Preview Overlay */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Monthly Report - ${monthName} ${year}`}
        filename={filename}
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
      >
        {renderReportDocument()}
      </PrintPreviewModal>
    </div>
  );
};
