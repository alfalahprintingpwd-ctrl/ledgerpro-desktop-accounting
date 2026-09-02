import React, { useRef, useState } from 'react';
import { Expense, BusinessProfile, Employee } from '../types';
import {
  formatDate,
  getDayName,
  formatCurrency,
  formatDateTimeLocal,
  getSystemTimeZone,
} from '../lib/utils';
import {
  X,
  Printer,
  Download,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Building,
  Wallet,
  User,
  ShieldCheck,
  Calendar,
  Tag,
  FileText,
} from 'lucide-react';
import { downloadPdfFromElement, sanitizeFilename } from '../lib/pdf';
import { triggerNativeWindowsPrint } from '../lib/print';

interface ExpenseVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  businessProfile: BusinessProfile | null;
  employees: Employee[];
  onEditExpense?: (expense: Expense) => void;
}

export const ExpenseVoucherModal: React.FC<ExpenseVoucherModalProps> = ({
  isOpen,
  onClose,
  expense,
  businessProfile,
  employees,
  onEditExpense,
}) => {
  const voucherRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen || !expense) return null;

  const currency = businessProfile?.currencySymbol || '$';
  const timeZone = getSystemTimeZone();
  const voucherNo = expense.voucherNumber || `EXP-${expense.date.slice(0, 4)}-0001`;
  const expenseDay = expense.day || getDayName(expense.date);

  // Find linked employee for signature if not already snapshotted
  const matchedEmployee = employees.find(
    (emp) =>
      emp.id === expense.employeeId ||
      emp.name.toLowerCase() === (expense.madeBy || '').toLowerCase()
  );

  const employeeSignature =
    expense.employeeSignatureSnapshot || matchedEmployee?.signatureUrl || '';
  const employeeDesignation = matchedEmployee?.designation || 'Staff / Responsible Person';

  const ceoName =
    expense.ceoNameSnapshot || businessProfile?.ceoName || 'Authorized Officer / CEO';
  const ceoSignature =
    expense.ceoSignatureSnapshot || businessProfile?.ceoSignatureUrl || '';
  const businessStamp =
    expense.businessStampSnapshot || businessProfile?.businessStampUrl || '';

  const filename = sanitizeFilename(`Expense-Voucher-${voucherNo}.pdf`);

  const handlePrint = () => {
    setToast(null);
    triggerNativeWindowsPrint({
      title: `Expense Voucher - ${voucherNo}`,
      landscape: false,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
  };

  const handleDownloadPDF = async () => {
    if (!voucherRef.current) return;
    setToast(null);
    const result = await downloadPdfFromElement(voucherRef.current, filename);
    if (result.success) {
      setToast({ type: 'success', message: result.message });
    } else if (!result.cancelled) {
      setToast({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[96vh]">
        {/* Modal Controls Header (Hidden on Print) */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-3.5 flex items-center justify-between shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                Expense Voucher Preview
                <span className="bg-rose-500/30 text-rose-300 font-mono text-xs px-2 py-0.5 rounded font-bold border border-rose-400/30">
                  {voucherNo}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Official Accounting Payment & Expense Voucher (A4 Printable)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditExpense && (
              <button
                onClick={() => {
                  onClose();
                  onEditExpense(expense);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              >
                Edit Expense
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>PRINT VOUCHER</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SAVE AS PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`px-6 py-2 text-xs font-bold flex items-center justify-between print:hidden ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-white hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Printable Voucher Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/70 dark:bg-slate-950/60 print:p-0 print:bg-white">
          <div
            ref={voucherRef}
            data-printable="true"
            className="bg-white text-slate-900 rounded-sm border border-slate-300 p-8 sm:p-12 space-y-6 font-sans printable-document max-w-[210mm] mx-auto shadow-xs"
          >
            {/* 1. Header: Business Information & Voucher Title */}
            <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start gap-4">
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
                    <p className="text-[11px] text-slate-700 font-mono mt-0.5 font-semibold">
                      NTN / STRN: {businessProfile.taxRegistrationNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="bg-rose-600 text-white text-xs font-black uppercase px-3.5 py-1.5 rounded tracking-wider shadow-2xs inline-block">
                  EXPENSE VOUCHER
                </span>
                <div className="text-xl font-black text-slate-900 mt-2 font-mono">
                  {voucherNo}
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  Date: {formatDate(expense.date)}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Day: {expenseDay}
                </div>
              </div>
            </div>

            {/* 2. Voucher Summary Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  Voucher Number
                </span>
                <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                  {voucherNo}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  Expense Category
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {expense.category}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  Payment Source
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-black mt-0.5 ${
                    expense.paymentSource === 'Cash' ? 'text-amber-800' : 'text-blue-800'
                  }`}
                >
                  {expense.paymentSource === 'Cash' ? (
                    <Wallet className="w-3.5 h-3.5" />
                  ) : (
                    <Building className="w-3.5 h-3.5" />
                  )}
                  {expense.paymentSource} Account
                </span>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  Voucher Total Amount
                </span>
                <span className="text-base font-black text-rose-700 font-mono mt-0.5 block">
                  {formatCurrency(expense.amount, currency)}
                </span>
              </div>
            </div>

            {/* 3. Expense Information Details Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider py-2.5 px-4 flex justify-between items-center">
                <span>Expense & Payment Information</span>
                <span className="font-mono text-slate-300 font-normal">
                  Accounting Record Reference: {expense.id}
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-700 w-1/3 bg-slate-50/50">
                      Expense Title / Head:
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {expense.title}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-700 bg-slate-50/50">
                      Detailed Description / Remarks:
                    </td>
                    <td className="py-3 px-4 text-slate-800 leading-relaxed">
                      {expense.description || (
                        <span className="text-slate-400 italic">No additional remarks provided</span>
                      )}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-700 bg-slate-50/50">
                      Expense Made By / Responsible Person:
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-600" />
                      <span>{expense.madeBy || '-'}</span>
                      {matchedEmployee?.designation && (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {matchedEmployee.designation}
                        </span>
                      )}
                      {matchedEmployee?.contactNumber && (
                        <span className="text-xs font-mono text-slate-500">
                          • {matchedEmployee.contactNumber}
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-700 bg-slate-50/50">
                      Payment Method & Source Verification:
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-2 text-xs font-bold cursor-default">
                          <span
                            className={`w-4 h-4 rounded-xs border flex items-center justify-center text-[10px] ${
                              expense.paymentSource === 'Cash'
                                ? 'bg-amber-600 text-white border-amber-700'
                                : 'border-slate-300 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span className={expense.paymentSource === 'Cash' ? 'text-slate-900' : 'text-slate-400'}>
                            Cash Vault / Petty Cash
                          </span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold cursor-default">
                          <span
                            className={`w-4 h-4 rounded-xs border flex items-center justify-center text-[10px] ${
                              expense.paymentSource === 'Bank'
                                ? 'bg-blue-600 text-white border-blue-700'
                                : 'border-slate-300 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span className={expense.paymentSource === 'Bank' ? 'text-slate-900' : 'text-slate-400'}>
                            Bank Account / Digital Transfer
                          </span>
                        </label>
                      </div>

                      <div className="mt-2 text-xs font-bold">
                        {expense.paymentSource === 'Cash' ? (
                          <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 inline-block font-mono">
                            Cash Expense Deducted: {formatCurrency(expense.amount, currency)}
                          </span>
                        ) : (
                          <span className="text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 inline-block font-mono">
                            Bank Expense Deducted: {formatCurrency(expense.amount, currency)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expense.notes && (
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-700 bg-slate-50/50">
                        Internal Approval Notes:
                      </td>
                      <td className="py-3 px-4 text-slate-700 italic">
                        {expense.notes}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Prominent Amount in Words / Total Box */}
            <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">
                  Total Approved Amount
                </span>
                <span className="text-2xl font-black text-rose-800 font-mono mt-0.5 block">
                  {formatCurrency(expense.amount, currency)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  Voucher Status
                </span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black border border-emerald-300 inline-flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> VERIFIED & POSTED
                </span>
              </div>
            </div>

            {/* 5. Dual Signature & Business Stamp Layout (Section 8, 9, 10, 11) */}
            <div className="pt-6 border-t-2 border-slate-900 mt-8 avoid-page-break">
              <div className="grid grid-cols-2 gap-8 items-end">
                {/* Left: Expense Made By Signature */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between h-44">
                  <div className="border-b border-slate-200 pb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 block">
                      Expense Made By / Responsible Person
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Verification of actual expense and receipt of funds
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center my-2">
                    {employeeSignature ? (
                      <img
                        src={employeeSignature}
                        alt="Employee Signature"
                        className="max-h-16 max-w-[180px] object-contain"
                      />
                    ) : (
                      <div className="w-48 border-b border-dashed border-slate-400 text-center font-serif text-[11px] italic text-slate-400 pt-8">
                        (Sign here upon payment)
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-slate-200">
                    <p className="font-bold text-slate-900 text-xs truncate">
                      Name: {expense.madeBy || '-'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Designation: {employeeDesignation}
                    </p>
                  </div>
                </div>

                {/* Right: CEO / Authorized Person Signature & Business Stamp */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between h-44 relative">
                  <div className="border-b border-slate-200 pb-1.5 flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 block">
                        CEO / Authorized Person
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Final executive sanction & financial audit
                      </span>
                    </div>
                  </div>

                  {/* Stamp & CEO Signature Area */}
                  <div className="flex-1 flex items-center justify-between px-2 my-1">
                    {businessStamp ? (
                      <div className="shrink-0">
                        <img
                          src={businessStamp}
                          alt="Official Business Stamp"
                          className="h-16 w-16 object-contain opacity-90"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 border border-dashed border-slate-300 rounded-full flex items-center justify-center text-[9px] text-slate-400 uppercase font-bold text-center p-1">
                        Official Stamp
                      </div>
                    )}

                    <div className="flex-1 flex justify-end">
                      {ceoSignature ? (
                        <img
                          src={ceoSignature}
                          alt="CEO Signature"
                          className="max-h-14 max-w-[160px] object-contain"
                        />
                      ) : (
                        <div className="w-40 border-b border-dashed border-slate-400 text-center font-serif text-[11px] italic text-slate-400 pt-6">
                          (Authorized CEO Sign)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 text-xs truncate">
                        Name: {ceoName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Executive Approval / Authorized Officer
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Meta Footnote */}
              <div className="mt-4 pt-2 flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-100">
                <span>
                  Generated: {formatDateTimeLocal()} • Timezone: {timeZone}
                </span>
                <span>
                  LedgerPro Accounting System • Expense Voucher Record #{voucherNo}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
