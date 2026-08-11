import React, { useState, useRef } from 'react';
import { Transaction, Expense, CashBankTransfer, BusinessProfile } from '../types';
import { formatDate, getDayName, formatCurrency, downloadCSV, getLocalAccountingDate, addDaysToLocalDate, formatDateTimePKT } from '../lib/utils';
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
} from 'lucide-react';
import { downloadPdfFromElement, sanitizeFilename } from '../lib/pdf';
import { triggerPrintDocument } from '../lib/print';
import { PrintPreviewModal } from './PrintPreviewModal';

interface DailyReportProps {
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
  onViewInvoice?: (tx: Transaction) => void;
}

export const DailyReport: React.FC<DailyReportProps> = ({
  transactions,
  expenses,
  transfers,
  businessProfile,
  onViewInvoice,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currency = businessProfile?.currencySymbol || '$';
  
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

  // Net Daily Collections
  const netDailyCashCollections = dailyCashReceived - dailyCashExpenses + cashTransferNet;
  const netDailyBankCollections = dailyBankReceived - dailyBankExpenses + bankTransferNet;
  const netTotalDailyCollections = dailyTotalReceived - dailyTotalExpenses;
  const grossDailyOperatingResult = dailyTotalSales - dailyTotalExpenses;

  const filename = sanitizeFilename(`Daily-Report-${selectedDate}.pdf`);

  const handlePrint = () => {
    setToast(null);
    const success = triggerPrintDocument({
      title: `Daily Financial Report - ${formattedSelectedDate}`,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
    if (success) {
      setToast({
        type: 'success',
        message: 'Daily report sent to printer spooler.',
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
      ['Daily Financial Report', `${formattedSelectedDate} (${dayName})`],
      ['Business Name', businessProfile?.name || ''],
      ['Generated On', formatDateTimePKT()],
      [],
      ['SALES SUMMARY'],
      ['Total Invoices Count', activeDailyTx.length],
      ['Total Sales Generated', dailyTotalSales],
      ['Total Received', dailyTotalReceived],
      ['Cash Received', dailyCashReceived],
      ['Bank Received', dailyBankReceived],
      ['Total Pending Receivables Created', dailyTotalPending],
      [],
      ['EXPENSES SUMMARY'],
      ['Total Expense Count', dailyExpenses.length],
      ['Total Expenses', dailyTotalExpenses],
      ['Cash Expenses', dailyCashExpenses],
      ['Bank Expenses', dailyBankExpenses],
      [],
      ['DAILY CASHFLOW & COLLECTIONS'],
      ['Net Cash Collections (Received - Expense + Transfer)', netDailyCashCollections],
      ['Net Bank Collections (Received - Expense + Transfer)', netDailyBankCollections],
      ['Net Collections Total', netTotalDailyCollections],
      ['Gross Operating Result (Sales - Expenses)', grossDailyOperatingResult],
      [],
      ['INVOICE DETAILS'],
      ['Invoice #', 'Customer Name', 'Phone', 'Total Bill', 'Received', 'Pending', 'Payment Method'],
      ...dailyTx.map((tx) => [
        tx.invoiceNumber,
        tx.customerName,
        tx.customerPhone || '',
        tx.grandTotal,
        tx.totalReceived,
        tx.pendingAmount,
        tx.paymentMethod,
      ]),
      [],
      ['EXPENSE DETAILS'],
      ['Category', 'Title', 'Payment Source', 'Amount'],
      ...dailyExpenses.map((e) => [
        e.category,
        e.title,
        e.paymentSource,
        e.amount,
      ]),
    ];

    downloadCSV(`Daily-Report-${selectedDate}.csv`, rows);
  };

  const renderReportDocument = () => (
    <div
      ref={reportRef}
      className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8 font-sans printable-document max-w-[210mm] mx-auto shadow-2xs"
      data-printable="true"
    >
      {/* Report Top Branding Header */}
      <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          {businessProfile?.logoUrl ? (
            <img
              src={businessProfile.logoUrl}
              alt={businessProfile?.name || 'Business Logo'}
              className="w-16 h-16 object-contain shrink-0 rounded-lg border border-slate-200 p-1"
            />
          ) : (
            <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl shrink-0">
              {(businessProfile?.name || 'B').charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {businessProfile?.name || 'Business Accounting System'}
            </h1>
            <p className="text-xs text-slate-600 mt-1">{businessProfile?.address}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Phone: {businessProfile?.phone}
              {businessProfile?.whatsapp && ` • WhatsApp: ${businessProfile.whatsapp}`}
              {businessProfile?.email && ` • Email: ${businessProfile.email}`}
            </p>
            {businessProfile?.taxRegistrationNumber && (
              <p className="text-[11px] text-slate-500 font-mono mt-0.5 font-semibold">
                NTN/STRN: {businessProfile.taxRegistrationNumber}
              </p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="bg-slate-900 text-white text-[11px] font-extrabold uppercase px-3 py-1.5 rounded tracking-wider shadow-2xs">
            DAILY FINANCIAL REPORT
          </span>
          <div className="text-lg font-black text-slate-900 mt-2 font-mono">
            {formattedSelectedDate}
          </div>
          <div className="text-xs text-blue-700 font-bold uppercase tracking-wider">{dayName}</div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Total Sales</span>
          <div className="text-xl font-black text-slate-900 mt-1">{formatCurrency(dailyTotalSales, currency)}</div>
          <span className="text-[10px] text-slate-500 font-medium">{activeDailyTx.length} Invoices</span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Total Received</span>
          <div className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(dailyTotalReceived, currency)}</div>
          <span className="text-[10px] text-slate-500 font-medium">
            Cash: {formatCurrency(dailyCashReceived, currency)} • Bank: {formatCurrency(dailyBankReceived, currency)}
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Daily Expenses</span>
          <div className="text-xl font-black text-red-600 mt-1">{formatCurrency(dailyTotalExpenses, currency)}</div>
          <span className="text-[10px] text-slate-500 font-medium">
            Cash: {formatCurrency(dailyCashExpenses, currency)} • Bank: {formatCurrency(dailyBankExpenses, currency)}
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Net Cash Flow</span>
          <div className={`text-xl font-black mt-1 ${netTotalDailyCollections >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            {formatCurrency(netTotalDailyCollections, currency)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Collections - Expenses</span>
        </div>
      </div>

      {/* Summary Statements Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales & Collections Breakdown */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>Sales & Collections</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Total Invoices Issued</span>
              <strong className="text-slate-900 font-bold">{activeDailyTx.length}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Gross Invoices Value</span>
              <strong className="text-slate-900 font-bold">{formatCurrency(dailyTotalSales, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Cash Collected</span>
              <strong className="text-emerald-700 font-bold">{formatCurrency(dailyCashReceived, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Bank / Digital Collected</span>
              <strong className="text-emerald-700 font-bold">{formatCurrency(dailyBankReceived, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Pending Receivables Created</span>
              <strong className="text-amber-700 font-bold">{formatCurrency(dailyTotalPending, currency)}</strong>
            </div>
            {voidedDailyTx.length > 0 && (
              <div className="flex justify-between py-1 text-red-600">
                <span>Voided Invoices ({voidedDailyTx.length})</span>
                <strong className="font-bold">{formatCurrency(voidedDailyTx.reduce((s, t) => s + t.grandTotal, 0), currency)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Expenses & Cashflow Breakdown */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>Expenses & Cashflow</span>
            <CreditCard className="w-4 h-4 text-red-600" />
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Cash Expenses</span>
              <strong className="text-red-600 font-bold">{formatCurrency(dailyCashExpenses, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Bank Expenses</span>
              <strong className="text-red-600 font-bold">{formatCurrency(dailyBankExpenses, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Total Outgoing Expenses</span>
              <strong className="text-red-700 font-bold">{formatCurrency(dailyTotalExpenses, currency)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Net Daily Cash Flow (Cash)</span>
              <strong className={`font-bold ${netDailyCashCollections >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(netDailyCashCollections, currency)}
              </strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Net Daily Bank Flow (Bank)</span>
              <strong className={`font-bold ${netDailyBankCollections >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(netDailyBankCollections, currency)}
              </strong>
            </div>
            <div className="flex justify-between py-1 font-bold text-slate-900 pt-1">
              <span>Gross Operating Result (Sales - Exp)</span>
              <span className={grossDailyOperatingResult >= 0 ? 'text-blue-700' : 'text-red-600'}>
                {formatCurrency(grossDailyOperatingResult, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center justify-between border-b border-slate-200 pb-2">
          <span>Daily Invoices & Sales Transactions ({dailyTx.length})</span>
          <span className="text-[10px] text-slate-500 font-normal">Date: {selectedDate}</span>
        </h3>

        {dailyTx.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            No invoices or sales entries recorded on {formattedSelectedDate}.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Work / Items</th>
                  <th className="py-2.5 px-3 text-center">Method</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Received</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {dailyTx.map((tx) => {
                  const isVoided = tx.isVoided || tx.status === 'voided';
                  return (
                    <tr key={tx.id} className={isVoided ? 'bg-red-50/50 text-slate-400 line-through' : ''}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{tx.invoiceNumber}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{tx.customerName}</div>
                        <div className="text-[10px] text-slate-500">{tx.customerPhone}</div>
                      </td>
                      <td className="py-2 px-3 max-w-xs truncate">
                        {tx.items.map((i) => i.name).join(', ')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(tx.grandTotal, currency)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatCurrency(tx.totalReceived, currency)}</td>
                      <td className="py-2 px-3 text-right font-bold text-amber-700">{formatCurrency(tx.pendingAmount, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 text-xs border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 uppercase tracking-wider text-[10px]">Total Active ({activeDailyTx.length})</td>
                  <td className="py-2.5 px-3 text-right">{formatCurrency(dailyTotalSales, currency)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">{formatCurrency(dailyTotalReceived, currency)}</td>
                  <td className="py-2.5 px-3 text-right text-amber-700">{formatCurrency(dailyTotalPending, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Daily Expenses Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
          <span>Daily Expenses ({dailyExpenses.length})</span>
          <span className="text-[10px] text-slate-500 font-normal">Total: {formatCurrency(dailyTotalExpenses, currency)}</span>
        </h3>

        {dailyExpenses.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            No expenses recorded on {formattedSelectedDate}.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description / Title</th>
                  <th className="py-2.5 px-3 text-center">Paid From</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {dailyExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="py-2 px-3 font-semibold text-slate-900">{exp.category}</td>
                    <td className="py-2 px-3">{exp.title} {exp.description ? `• ${exp.description}` : ''}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${exp.paymentSource === 'Cash' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {exp.paymentSource}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-red-600">{formatCurrency(exp.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 text-xs border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider text-[10px]">Total Daily Expenses</td>
                  <td className="py-2.5 px-3 text-right text-red-600">{formatCurrency(dailyTotalExpenses, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Report Footer Signatures */}
      <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-600 avoid-page-break">
        <div>
          <p className="font-bold text-slate-900">{businessProfile?.name || 'LedgerPro Accounting'}</p>
          <p className="text-[10px] text-slate-500">Report Date: {formattedSelectedDate} ({dayName})</p>
          <p className="text-[10px] text-slate-400 mt-1">Generated electronically by LedgerPro Desktop Accounting System</p>
        </div>

        <div className="text-right flex items-end gap-4">
          {businessProfile?.businessStampUrl && (
            <div className="text-center">
              <img
                src={businessProfile.businessStampUrl}
                alt="Business Stamp"
                className="h-14 w-14 object-contain opacity-85 mx-auto"
              />
              <span className="text-[9px] text-slate-400 uppercase font-semibold block mt-0.5">Official Stamp</span>
            </div>
          )}

          <div className="text-right">
            <div className="h-12 flex items-end justify-end mb-1">
              {businessProfile?.ceoSignatureUrl ? (
                <img
                  src={businessProfile.ceoSignatureUrl}
                  alt="CEO Signature"
                  className="h-12 object-contain"
                />
              ) : (
                <div className="w-36 border-b border-slate-400 text-center font-serif text-[11px] italic pb-1">
                  {businessProfile?.ceoName || 'Authorized CEO'}
                </div>
              )}
            </div>
            <p className="font-bold text-slate-900">{businessProfile?.ceoName || 'CEO / Authorized Manager'}</p>
            <p className="text-[10px] text-slate-500">Authorized Signature & Stamp</p>
          </div>
        </div>
      </div>
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Daily Financial Report</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detailed daily breakdown of invoices, revenue, expenses, and cash collections.
          </p>
        </div>

        {/* Date Selector & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => changeDateByDays(-1)}
            title="Navigate to Previous Day (Ctrl+Left)"
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Previous Day</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(getLocalAccountingDate())}
            title="Jump to Today's Report (Ctrl+T)"
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition flex items-center gap-1 cursor-pointer ${
              selectedDate === currentLocalToday
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/30'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
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
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next Day</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block" />

          <div className="flex items-center gap-2 px-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            />
            <span className="text-xs font-extrabold text-blue-700 font-mono hidden md:inline">
              ({dayName})
            </span>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>Preview</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-200" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Daily Sales</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(dailyTotalSales, currency)}</div>
            <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <span className="font-bold text-slate-800">{activeDailyTx.length} Invoices</span>
              {voidedDailyTx.length > 0 && (
                <span className="text-[10px] text-red-500 font-semibold">({voidedDailyTx.length} Voided)</span>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px]">
            <span className="text-slate-500">Pending Receivables:</span>
            <strong className="text-amber-700 font-bold">{formatCurrency(dailyTotalPending, currency)}</strong>
          </div>
        </div>

        {/* Card 2: Received Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Revenue Collected</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-800">{formatCurrency(dailyTotalReceived, currency)}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Cash: <strong className="text-slate-800">{formatCurrency(dailyCashReceived, currency)}</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px]">
            <span className="text-slate-500">Bank / Digital:</span>
            <strong className="text-blue-700 font-bold">{formatCurrency(dailyBankReceived, currency)}</strong>
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Daily Expenses</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">{formatCurrency(dailyTotalExpenses, currency)}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {dailyExpenses.length} Expense entries
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px]">
            <span className="text-slate-500">Cash: {formatCurrency(dailyCashExpenses, currency)}</span>
            <span className="text-slate-500">Bank: {formatCurrency(dailyBankExpenses, currency)}</span>
          </div>
        </div>

        {/* Card 4: Net Daily Cash Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Net Cash Collections</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black ${netTotalDailyCollections >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              {formatCurrency(netTotalDailyCollections, currency)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Revenue minus Expenses
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px]">
            <span className="text-slate-500">Gross Result:</span>
            <strong className={`font-bold ${grossDailyOperatingResult >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(grossDailyOperatingResult, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Embedded Document / Tables Section */}
      <div className="bg-slate-100/70 p-4 sm:p-6 rounded-2xl border border-slate-200">
        {renderReportDocument()}
      </div>

      {/* Print Preview Modal */}
      {isPreviewOpen && (
        <PrintPreviewModal
          documentTitle={`Daily Report - ${formattedSelectedDate}`}
          printableElement={renderReportDocument()}
          onClose={() => setIsPreviewOpen(false)}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
};
