import React, { useState, useRef } from 'react';
import { Transaction, Expense, CashBankTransfer, MonthFile, BusinessProfile } from '../types';
import { calculateMonthTotals, formatCurrency, downloadCSV, getLocalAccountingYear, formatDateTimePKT } from '../lib/utils';
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
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { downloadPdfFromElement, sanitizeFilename } from '../lib/pdf';
import { triggerPrintDocument } from '../lib/print';
import { PrintPreviewModal } from './PrintPreviewModal';

interface YearlyReportProps {
  months: MonthFile[];
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
}

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

  const currency = businessProfile?.currencySymbol || '$';
  const currentYear = getLocalAccountingYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Keyboard Shortcuts Listener for Yearly Report navigation
  React.useEffect(() => {
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

  const yearData = MONTH_NAMES.map((mName, idx) => {
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
      cashBalance: totals.cashBalance,
      bankBalance: totals.bankBalance,
      grossProfit: totals.grossOperatingResult,
    };
  });

  const totalYearSales = yearData.reduce((sum, d) => sum + d.sales, 0);
  const totalYearReceived = yearData.reduce((sum, d) => sum + d.received, 0);
  const totalYearPending = yearData.reduce((sum, d) => sum + d.pending, 0);
  const totalYearExpenses = yearData.reduce((sum, d) => sum + d.expenses, 0);
  const totalYearGrossProfit = totalYearSales - totalYearExpenses;

  const filename = sanitizeFilename(`Yearly-Report-${selectedYear}.pdf`);

  const handlePrint = () => {
    setToast(null);
    const success = triggerPrintDocument({
      title: `Yearly Report - ${selectedYear}`,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
    if (success) {
      setToast({
        type: 'success',
        message: 'Yearly report sent to Windows printer spooler.',
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
      ['Annual Accounting Financial Report', selectedYear],
      ['Business Name', businessProfile?.name || ''],
      ['Generated On', formatDateTimePKT()],
      [],
      ['Month', 'Sales', 'Received', 'Pending', 'Expenses', 'Gross Profit'],
      ...yearData.map((d) => [d.monthName, d.sales, d.received, d.pending, d.expenses, d.grossProfit]),
      [],
      ['ANNUAL TOTALS', totalYearSales, totalYearReceived, totalYearPending, totalYearExpenses, totalYearGrossProfit],
    ];

    downloadCSV(`Yearly-Report-${selectedYear}.csv`, rows);
  };

  const renderReportDocument = () => (
    <div ref={reportRef} className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8 font-sans printable-document" data-printable="true">
      {/* Branding Header */}
      <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start">
        <div className="flex items-start gap-4">
          {businessProfile?.logoUrl && (
            <img src={businessProfile.logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">
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
            ANNUAL FINANCIAL AUDIT
          </span>
          <div className="text-xl font-black text-slate-900 mt-2">YEAR {selectedYear}</div>
        </div>
      </div>

      {/* 4 Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase text-blue-800 block">Total Annual Sales</span>
          <strong className="text-xl font-bold text-blue-900 block mt-1">
            {formatCurrency(totalYearSales, currency)}
          </strong>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Money Received</span>
          <strong className="text-xl font-bold text-emerald-900 block mt-1">
            {formatCurrency(totalYearReceived, currency)}
          </strong>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Total Pending Receivables</span>
          <strong className="text-xl font-bold text-amber-900 block mt-1">
            {formatCurrency(totalYearPending, currency)}
          </strong>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase text-rose-800 block">Total Annual Expenses</span>
          <strong className="text-xl font-bold text-rose-900 block mt-1">
            {formatCurrency(totalYearExpenses, currency)}
          </strong>
        </div>
      </div>

      {/* Recharts Yearly Bar & Line Trends */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          12 Months Sales vs Expenses Trend ({selectedYear})
        </h3>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="monthName" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              <Legend />
              <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="received" name="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed 12 Month Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Month</th>
              <th className="py-3 px-4 text-right">Sales</th>
              <th className="py-3 px-4 text-right">Received</th>
              <th className="py-3 px-4 text-right">Pending</th>
              <th className="py-3 px-4 text-right">Expenses</th>
              <th className="py-3 px-4 text-right">Gross Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {yearData.map((d, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-900">{d.monthName}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(d.sales, currency)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                  {formatCurrency(d.received, currency)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-amber-600 font-semibold">
                  {formatCurrency(d.pending, currency)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                  {formatCurrency(d.expenses, currency)}
                </td>
                <td
                  className={`py-3 px-4 text-right font-mono font-bold ${
                    d.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(d.grossProfit, currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-bold">
            <tr>
              <td className="py-3 px-4 uppercase text-xs">Annual Total ({selectedYear})</td>
              <td className="py-3 px-4 text-right font-mono">{formatCurrency(totalYearSales, currency)}</td>
              <td className="py-3 px-4 text-right font-mono text-emerald-400">
                {formatCurrency(totalYearReceived, currency)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-amber-400">
                {formatCurrency(totalYearPending, currency)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-rose-400">
                {formatCurrency(totalYearExpenses, currency)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-emerald-300">
                {formatCurrency(totalYearGrossProfit, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
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
              Annual Report issued by {businessProfile?.name || 'LedgerPro Accounting'}
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
            <BarChart3 className="w-6 h-6 text-blue-600" /> Annual Financial Summary & Yearly Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive year-over-year financial comparisons and analytical breakdowns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Select Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
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
            <Printer className="w-4 h-4" /> Print
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
        title={`Yearly Report - ${selectedYear}`}
        filename={filename}
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
      >
        {renderReportDocument()}
      </PrintPreviewModal>
    </div>
  );
};
