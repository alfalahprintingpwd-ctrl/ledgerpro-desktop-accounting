import React, { useRef, useState } from 'react';
import { Expense, ExpenseCategory, MonthFile, BusinessProfile } from '../types';
import { formatDate, formatCurrency, getLocalAccountingYear, formatDateTimePKT } from '../lib/utils';
import {
  X,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Wallet,
  Building,
} from 'lucide-react';
import { downloadPdfFromElement, sanitizeFilename } from '../lib/pdf';
import { triggerPrintDocument } from '../lib/print';
import { PrintPreviewModal } from './PrintPreviewModal';

interface ExpenseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMonth: MonthFile | undefined;
  expenses: Expense[];
  customCategories: ExpenseCategory[];
  businessProfile: BusinessProfile | null;
}

export const ExpenseReportModal: React.FC<ExpenseReportModalProps> = ({
  isOpen,
  onClose,
  activeMonth,
  expenses,
  customCategories,
  businessProfile,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const currency = businessProfile?.currencySymbol || '$';
  const monthId = activeMonth?.id || '';
  const monthExpenses = expenses.filter((e) => e.monthId === monthId);

  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cashExpenses = monthExpenses.filter((e) => e.paymentSource === 'Cash').reduce((sum, e) => sum + e.amount, 0);
  const bankExpenses = monthExpenses.filter((e) => e.paymentSource === 'Bank').reduce((sum, e) => sum + e.amount, 0);

  // Group Expenses by Category
  const expenseByCategory: Record<string, { count: number; total: number }> = {};
  monthExpenses.forEach((e) => {
    if (!expenseByCategory[e.category]) {
      expenseByCategory[e.category] = { count: 0, total: 0 };
    }
    expenseByCategory[e.category].count += 1;
    expenseByCategory[e.category].total += e.amount;
  });

  const categoryRows = Object.entries(expenseByCategory).map(([cat, val]) => ({
    category: cat,
    count: val.count,
    amount: val.total,
    percentage: totalExpenses > 0 ? (val.total / totalExpenses) * 100 : 0,
  }));

  const monthName = activeMonth?.monthName || 'All';
  const year = activeMonth?.year || getLocalAccountingYear();
  const filename = sanitizeFilename(`Expense-Report-${monthName}-${year}.pdf`);

  const handlePrint = () => {
    setToast(null);
    const success = triggerPrintDocument({
      title: `Expense Report - ${monthName} ${year}`,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
    if (success) {
      setToast({
        type: 'success',
        message: 'Expense Report sent to Windows printer spooler.',
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

  const renderReportDocument = () => (
    <div className="p-8 bg-white text-slate-800 font-sans space-y-6 printable-document" ref={reportRef} data-printable="true">
      {/* Header Section */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
        <div className="flex items-start gap-4">
          {businessProfile?.logoUrl && (
            <img
              src={businessProfile.logoUrl}
              alt="Business Logo"
              className="w-16 h-16 object-contain rounded"
            />
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {businessProfile?.name || 'Printing Studio & Accounting'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">{businessProfile?.address}</p>
            <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3">
              <span>Tel: {businessProfile?.phone}</span>
              {businessProfile?.whatsapp && <span>WhatsApp: {businessProfile.whatsapp}</span>}
              {businessProfile?.email && <span>Email: {businessProfile.email}</span>}
            </div>
            {businessProfile?.taxRegistrationNumber && (
              <div className="text-[11px] font-semibold text-slate-700 mt-1">
                {businessProfile.taxRegistrationNumber}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-rose-900 text-white px-4 py-1.5 font-extrabold text-sm uppercase tracking-widest rounded mb-2">
            EXPENSE AUDIT REPORT
          </div>
          <div className="text-base font-bold text-slate-900">
            {monthName} {year}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Audit Date: {formatDateTimePKT()}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase text-rose-800 block">Total Expenses ({monthName})</span>
          <strong className="text-xl font-bold text-rose-900 block mt-0.5">
            {formatCurrency(totalExpenses, currency)}
          </strong>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Paid from Cash Account</span>
          <strong className="text-xl font-bold text-emerald-900 block mt-0.5">
            {formatCurrency(cashExpenses, currency)}
          </strong>
        </div>

        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase text-blue-800 block">Paid from Bank Account</span>
          <strong className="text-xl font-bold text-blue-900 block mt-0.5">
            {formatCurrency(bankExpenses, currency)}
          </strong>
        </div>
      </div>

      {/* Expense Category Breakdown */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-200 pb-1">
          1. Expense Category Analysis
        </h3>

        {categoryRows.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs border border-slate-200 rounded-xl">
            No expenses recorded.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Expense Category</th>
                  <th className="py-2.5 px-3 text-center">Entries</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-right">% of Expense</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {categoryRows.map((cat, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{cat.category}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{cat.count}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(cat.amount, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {cat.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Itemized Expenses Table */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-200 pb-1">
          2. Itemized Expense Ledger
        </h3>

        {monthExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-slate-200 rounded-xl">
            No expense entries recorded for {monthName} {year}.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Expense Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Remarks / Description</th>
                  <th className="py-2.5 px-3 text-center">Source</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {monthExpenses.map((exp, index) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-slate-400">{index + 1}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{formatDate(exp.date)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{exp.title}</td>
                    <td className="py-3 px-3 text-slate-600">{exp.category}</td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{exp.description || '-'}</td>
                    <td className="py-3 px-3 text-center font-bold">
                      {exp.paymentSource === 'Cash' ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Cash</span>
                      ) : (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">Bank</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                      {formatCurrency(exp.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden border border-slate-200 my-auto">
          {/* Action Header bar */}
          <div className="print:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-400" />
              <span className="font-mono text-sm font-bold text-rose-300">
                Expense Report ({monthName} {year})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-rose-400" /> Print Preview
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Report
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save PDF
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition ml-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toast Notification Banner */}
          {toast && (
            <div
              className={`px-6 py-2 text-xs font-bold flex items-center justify-between shrink-0 ${
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

          {/* Printable Document View */}
          <div className="overflow-y-auto max-h-[80vh]">{renderReportDocument()}</div>
        </div>
      </div>

      {/* Print Preview Overlay */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Expense Report - ${monthName} ${year}`}
        filename={filename}
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
      >
        {renderReportDocument()}
      </PrintPreviewModal>
    </>
  );
};
