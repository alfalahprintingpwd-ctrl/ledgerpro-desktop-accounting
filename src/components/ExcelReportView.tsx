import React from 'react';
import { Transaction, Expense, BusinessProfile } from '../types';
import { formatCurrency, formatDate, formatDateTimeLocal, getSystemTimeZone } from '../lib/utils';

export interface ExcelReportViewProps {
  reportType: 'Daily' | 'Monthly' | 'Yearly';
  periodTitle: string; // e.g. "Wednesday, 19-Aug-2026" or "August 2026" or "Year 2026"
  businessProfile: BusinessProfile | null;
  currencySymbol?: string;

  // Top Summary Numbers
  totalSale: number;
  totalExpense: number;
  availableMoney: number;
  cashBalance: number;
  bankBalance: number;

  // Transactions & Expenses
  transactions: Transaction[];
  expenses: Expense[];

  // Optional closing balances
  closingCash?: number;
  closingBank?: number;
}

export const ExcelReportView: React.FC<ExcelReportViewProps> = ({
  reportType,
  periodTitle,
  businessProfile,
  currencySymbol,
  totalSale,
  totalExpense,
  availableMoney,
  cashBalance,
  bankBalance,
  transactions,
  expenses,
  closingCash,
  closingBank,
}) => {
  const currency = currencySymbol || businessProfile?.currencySymbol || 'Rs. ';
  const timeZone = getSystemTimeZone();

  const activeSales = transactions.filter((t) => !t.isVoided && t.status !== 'voided');
  const totalSalesBill = activeSales.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
  const totalSalesReceived = activeSales.reduce((sum, t) => sum + (t.totalReceived || 0), 0);
  const totalSalesPending = activeSales.reduce((sum, t) => sum + (t.pendingAmount || 0), 0);

  const expensesList = expenses || [];
  const totalExpenseAmount = expensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

  const finalCash = closingCash !== undefined ? closingCash : cashBalance;
  const finalBank = closingBank !== undefined ? closingBank : bankBalance;
  const finalAvailable = finalCash + finalBank;

  return (
    <div
      className="excel-report-root bg-white text-slate-900 font-sans p-6 md:p-8 space-y-6 max-w-full print:p-0 print:space-y-4"
      style={{ minWidth: '100%' }}
    >
      {/* -------------------------------------------------------------
          1. HEADER: Business Info & Report Period
      ------------------------------------------------------------- */}
      <div className="border-b-2 border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 print:border-b-2 print:pb-2">
        <div>
          <div className="flex items-center gap-3">
            {businessProfile?.logoUrl && (
              <img
                src={businessProfile.logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded print:w-8 print:h-8"
              />
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 print:text-lg">
                {businessProfile?.name || 'LedgerPro Accounting & Invoicing'}
              </h1>
              <p className="text-xs text-slate-600 print:text-[10px]">
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
        </div>

        <div className="text-left md:text-right">
          <div className="inline-block bg-blue-50 text-blue-700 font-black text-xs px-3 py-1 rounded border border-blue-200 uppercase tracking-wider print:border-none print:p-0">
            {reportType.toUpperCase()} FINANCIAL & ACCOUNTING STATEMENT
          </div>
          <div className="text-xs font-bold text-slate-800 mt-1 print:text-[11px]">
            Period: <span className="font-extrabold text-blue-900">{periodTitle}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5 print:text-[9px]">
            Generated: {formatDateTimeLocal(new Date().toISOString())} ({timeZone})
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. TOP SUMMARY BOXES (5 Excel Cards)
      ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">
        {/* TOTAL SALE */}
        <div className="border-2 border-blue-200 bg-blue-50/60 rounded-lg p-3 text-center print:p-2 print:border">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 mb-1 border-b border-blue-200 pb-1">
            TOTAL SALE
          </div>
          <div className="text-base md:text-lg font-black text-blue-700 print:text-sm">
            {formatCurrency(totalSale, currency)}
          </div>
        </div>

        {/* TOTAL EXPENSE */}
        <div className="border-2 border-rose-200 bg-rose-50/60 rounded-lg p-3 text-center print:p-2 print:border">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-900 mb-1 border-b border-rose-200 pb-1">
            TOTAL EXPENSE
          </div>
          <div className="text-base md:text-lg font-black text-rose-700 print:text-sm">
            {formatCurrency(totalExpense, currency)}
          </div>
        </div>

        {/* AVAILABLE MONEY */}
        <div className="border-2 border-emerald-200 bg-emerald-50/60 rounded-lg p-3 text-center print:p-2 print:border">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 mb-1 border-b border-emerald-200 pb-1">
            AVAILABLE MONEY
          </div>
          <div className="text-base md:text-lg font-black text-emerald-700 print:text-sm">
            {formatCurrency(availableMoney, currency)}
          </div>
        </div>

        {/* CASH */}
        <div className="border-2 border-slate-300 bg-slate-50 rounded-lg p-3 text-center print:p-2 print:border">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-1 border-b border-slate-200 pb-1">
            CASH
          </div>
          <div className="text-base md:text-lg font-black text-slate-800 print:text-sm">
            {formatCurrency(cashBalance, currency)}
          </div>
        </div>

        {/* ACCOUNT / BANK */}
        <div className="border-2 border-slate-300 bg-slate-50 rounded-lg p-3 text-center print:p-2 print:border">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-1 border-b border-slate-200 pb-1">
            ACCOUNT / BANK
          </div>
          <div className="text-base md:text-lg font-black text-slate-800 print:text-sm">
            {formatCurrency(bankBalance, currency)}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. SALES DETAILS TABLE (Excel-Style Table)
      ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="bg-slate-800 text-white px-4 py-2 rounded-t font-black text-xs uppercase tracking-wider flex items-center justify-between print:bg-slate-900">
          <span>SALES DETAILS</span>
          <span className="text-[11px] font-normal text-slate-200">
            {activeSales.length} Invoices Recorded
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-slate-300 rounded-b print:border print:overflow-visible">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px] border-b-2 border-slate-400">
              <tr>
                <th className="border border-slate-300 py-2 px-2.5 text-center w-24">Date</th>
                <th className="border border-slate-300 py-2 px-2.5 text-center w-28">Invoice No.</th>
                <th className="border border-slate-300 py-2 px-3">Customer Name</th>
                <th className="border border-slate-300 py-2 px-2.5 w-28">Contact</th>
                <th className="border border-slate-300 py-2 px-3">Work / Product Detail</th>
                <th className="border border-slate-300 py-2 px-3 text-right w-28">Total Bill</th>
                <th className="border border-slate-300 py-2 px-3 text-right w-28">Received</th>
                <th className="border border-slate-300 py-2 px-3 text-right w-28">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white">
              {activeSales.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-slate-300 py-4 px-3 text-center text-slate-400 italic"
                  >
                    No sales recorded for this period.
                  </td>
                </tr>
              ) : (
                activeSales.map((tx) => {
                  const contact = tx.customerPhone || '-';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 py-2 px-2 text-center whitespace-nowrap text-slate-700">
                        {formatDate(tx.date)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold text-blue-700 whitespace-nowrap">
                        {tx.invoiceNumber}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 font-semibold text-slate-900">
                        {tx.customerName || 'Walk-in Customer'}
                      </td>
                      <td className="border border-slate-300 py-2 px-2.5 text-slate-600 font-mono text-[11px]">
                        {contact}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-slate-800">
                        {tx.items && tx.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {tx.items.map((item, idx) => (
                              <div key={idx} className="text-[11px] leading-tight">
                                <span className="font-semibold text-slate-900">• {item.name || item.description}</span>
                                {item.quantity ? <span className="text-slate-600 text-[10px]"> ({item.quantity}x @ {formatCurrency(item.unitPrice, currency)})</span> : ''}
                              </div>
                            ))}
                            {tx.notes && (
                              <div className="text-[10px] text-slate-500 italic mt-0.5">
                                Note: {tx.notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span>General Sales Service</span>
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(tx.grandTotal, currency)}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatCurrency(tx.totalReceived, currency)}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        {formatCurrency(tx.pendingAmount, currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-400">
              <tr>
                <td colSpan={5} className="border border-slate-300 py-2.5 px-3 text-right uppercase tracking-wider text-xs">
                  TOTAL SALES
                </td>
                <td className="border border-slate-300 py-2.5 px-3 text-right font-mono text-blue-700 whitespace-nowrap text-xs">
                  {formatCurrency(totalSalesBill, currency)}
                </td>
                <td className="border border-slate-300 py-2.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap text-xs">
                  {formatCurrency(totalSalesReceived, currency)}
                </td>
                <td className="border border-slate-300 py-2.5 px-3 text-right font-mono text-rose-700 whitespace-nowrap text-xs">
                  {formatCurrency(totalSalesPending, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------
          4. EXPENSE DETAILS TABLE (Excel-Style Table)
      ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="bg-slate-800 text-white px-4 py-2 rounded-t font-black text-xs uppercase tracking-wider flex items-center justify-between print:bg-slate-900">
          <span>EXPENSE DETAILS</span>
          <span className="text-[11px] font-normal text-slate-200">
            {expensesList.length} Expenses Recorded
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-slate-300 rounded-b print:border print:overflow-visible">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px] border-b-2 border-slate-400">
              <tr>
                <th className="border border-slate-300 py-2 px-2.5 text-center w-24">Date</th>
                <th className="border border-slate-300 py-2 px-2.5 text-center w-28">Voucher No.</th>
                <th className="border border-slate-300 py-2 px-3">Expense Title & Description</th>
                <th className="border border-slate-300 py-2 px-3 w-36">Category</th>
                <th className="border border-slate-300 py-2 px-3 text-right w-32">Amount</th>
                <th className="border border-slate-300 py-2 px-2.5 text-center w-28">Payment Method</th>
                <th className="border border-slate-300 py-2 px-3 w-44">Expense Made By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white">
              {expensesList.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border border-slate-300 py-4 px-3 text-center text-slate-400 italic"
                  >
                    No expenses recorded for this period.
                  </td>
                </tr>
              ) : (
                expensesList.map((exp) => {
                  const voucherNo =
                    exp.voucherNumber ||
                    `EXP-${(exp.id || '').slice(-4).toUpperCase() || '0001'}`;
                  const paymentMethod = exp.paymentSource === 'Bank' ? 'Bank / Account' : 'Cash';
                  const madeBy = exp.madeBy || '-';

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 py-2 px-2 text-center whitespace-nowrap text-slate-700">
                        {formatDate(exp.date)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold text-slate-800 whitespace-nowrap">
                        {voucherNo}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 font-semibold text-slate-900">
                        <div>{exp.title}</div>
                        {exp.description && (
                          <div className="text-[10px] text-slate-500 font-normal italic mt-0.5">
                            {exp.description}
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-slate-700">
                        {exp.category || 'General Expense'}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        {formatCurrency(exp.amount, currency)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center text-slate-700 whitespace-nowrap">
                        {paymentMethod}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 font-semibold text-slate-900">
                        {madeBy}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-400">
              <tr>
                <td colSpan={4} className="border border-slate-300 py-2.5 px-3 text-right uppercase tracking-wider text-xs">
                  TOTAL EXPENSES
                </td>
                <td className="border border-slate-300 py-2.5 px-3 text-right font-mono text-rose-700 whitespace-nowrap text-xs">
                  {formatCurrency(totalExpenseAmount, currency)}
                </td>
                <td colSpan={2} className="border border-slate-300 py-2.5 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------
          5. FINAL CLOSING BALANCE POSITION
      ------------------------------------------------------------- */}
      <div className="border-2 border-slate-300 rounded overflow-hidden">
        <div className="bg-slate-900 text-white text-center py-1.5 text-xs font-black uppercase tracking-wider">
          FINAL CLOSING POSITION & CASH/BANK LIQUIDITY
        </div>
        <div className="grid grid-cols-3 text-center divide-x-2 divide-slate-300 bg-slate-50 text-xs">
          <div className="p-3">
            <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">
              CLOSING CASH IN HAND
            </div>
            <div className="font-mono font-black text-slate-900 text-sm">
              {formatCurrency(finalCash, currency)}
            </div>
          </div>
          <div className="p-3">
            <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">
              CLOSING BANK / ACCOUNT BALANCE
            </div>
            <div className="font-mono font-black text-slate-900 text-sm">
              {formatCurrency(finalBank, currency)}
            </div>
          </div>
          <div className="p-3 bg-emerald-50/70">
            <div className="text-[10px] font-bold text-emerald-900 uppercase mb-1">
              TOTAL AVAILABLE MONEY
            </div>
            <div className="font-mono font-black text-emerald-700 text-sm">
              {formatCurrency(finalAvailable, currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
