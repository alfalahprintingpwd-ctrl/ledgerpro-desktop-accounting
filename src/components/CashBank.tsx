import React, { useState } from 'react';
import { Transaction, Expense, CashBankTransfer, MonthFile, BusinessProfile } from '../types';
import { calculateMonthTotals, formatDate, formatCurrency, getLocalAccountingDate } from '../lib/utils';
import {
  Wallet,
  Building,
  ArrowRightLeft,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  History,
} from 'lucide-react';

interface CashBankProps {
  activeMonth: MonthFile | undefined;
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
  onAddTransfer: (transfer: CashBankTransfer) => void;
}

export const CashBank: React.FC<CashBankProps> = ({
  activeMonth,
  transactions,
  expenses,
  transfers,
  businessProfile,
  onAddTransfer,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const monthId = activeMonth?.id || '';

  const totals = calculateMonthTotals(monthId, transactions, expenses, transfers, activeMonth);

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromSource, setFromSource] = useState<'Cash' | 'Bank'>('Cash');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNote, setTransferNote] = useState('');

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferAmount <= 0) {
      alert('Transfer amount must be greater than 0');
      return;
    }

    const toSource = fromSource === 'Cash' ? 'Bank' : 'Cash';

    const tr: CashBankTransfer = {
      id: `tr_${Date.now()}`,
      date: getLocalAccountingDate(),
      monthId,
      from: fromSource,
      to: toSource,
      amount: transferAmount,
      note: transferNote.trim() || `Transferred from ${fromSource} to ${toSource}`,
      createdAt: new Date().toISOString(),
    };

    onAddTransfer(tr);
    setIsTransferModalOpen(false);
    setTransferAmount(0);
    setTransferNote('');
  };

  // Month transfers
  const monthTransfers = transfers.filter((t) => t.monthId === monthId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Cash & Bank / Account Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time balance tracking for Cash, Bank, and internal transfers
          </p>
        </div>

        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowRightLeft className="w-4 h-4" /> Internal Cash/Bank Transfer
        </button>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cash Card */}
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                PHYSICAL CASH BALANCE
              </span>
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
              {formatCurrency(totals.cashBalance, currency)}
            </div>

            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between">
                <span>Opening Cash Balance:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(totals.openingCash, currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>+ Cash Received (Sales):</span>
                <span>{formatCurrency(totals.cashReceived, currency)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                <span>- Cash Expenses Paid:</span>
                <span>{formatCurrency(totals.cashExpenses, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Card */}
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-800/60 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold uppercase text-blue-800 dark:text-blue-300 tracking-wider">
                BANK / ACCOUNT BALANCE
              </span>
              <div className="p-2.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-xl">
                <Building className="w-6 h-6" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
              {formatCurrency(totals.bankBalance, currency)}
            </div>

            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between">
                <span>Opening Bank Balance:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(totals.openingBank, currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>+ Bank Received (Sales):</span>
                <span>{formatCurrency(totals.bankReceived, currency)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                <span>- Bank Expenses Paid:</span>
                <span>{formatCurrency(totals.bankExpenses, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Available Balance Card */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase text-blue-400 tracking-wider">
                TOTAL AVAILABLE MONEY
              </span>
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>

            <div className="text-4xl font-black text-white mb-2">
              {formatCurrency(totals.totalAvailableBalance, currency)}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
              Total Available Money automatically equals Cash Balance + Bank Balance.
            </p>
          </div>
        </div>
      </div>

      {/* Internal Transfers History */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Internal Transfers Ledger ({activeMonth?.monthName})
        </h3>

        {monthTransfers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No internal cash/bank transfers recorded for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">From Source</th>
                  <th className="py-2.5 px-3">To Source</th>
                  <th className="py-2.5 px-3">Transfer Note / Reason</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthTransfers.map((tr) => (
                  <tr key={tr.id}>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">{formatDate(tr.date)}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">{tr.from}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">{tr.to}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{tr.note}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                      {formatCurrency(tr.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Internal Cash/Bank Transfer
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Transfer Direction
                </label>
                <select
                  value={fromSource}
                  onChange={(e) => setFromSource(e.target.value as 'Cash' | 'Bank')}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-bold outline-none"
                >
                  <option value="Cash">Deposit Cash into Bank (Cash &rarr; Bank)</option>
                  <option value="Bank">Withdraw Cash from Bank (Bank &rarr; Cash)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Transfer Amount ({currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Transfer Note / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excess cash deposit to Meezan Bank"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
