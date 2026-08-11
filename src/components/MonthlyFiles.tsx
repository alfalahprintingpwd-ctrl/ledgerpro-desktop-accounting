import React, { useState } from 'react';
import { MonthFile, Transaction, Expense, CashBankTransfer, BusinessProfile } from '../types';
import { calculateMonthTotals, formatCurrency, getLocalAccountingYear, getLocalAccountingMonthNumber } from '../lib/utils';
import {
  FolderTree,
  FolderPlus,
  Folder,
  Lock,
  Unlock,
  FileCheck2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
} from 'lucide-react';

interface MonthlyFilesProps {
  months: MonthFile[];
  activeMonthId: string;
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
  onSelectMonth: (monthId: string) => void;
  onCreateNewMonth: (year: number, monthNumber: number, monthName: string) => void;
  onFinishMonth: (monthId: string) => void;
  onReopenMonth: (monthId: string) => void;
  onNavigateToReport: (monthId: string) => void;
}

export const MonthlyFiles: React.FC<MonthlyFilesProps> = ({
  months,
  activeMonthId,
  transactions,
  expenses,
  transfers,
  businessProfile,
  onSelectMonth,
  onCreateNewMonth,
  onFinishMonth,
  onReopenMonth,
  onNavigateToReport,
}) => {
  const currency = businessProfile?.currencySymbol || '$';

  // Active month
  const currentMonthFile = months.find((m) => m.id === activeMonthId) || months[months.length - 1];

  // Active month header summary
  const monthTotals = calculateMonthTotals(
    currentMonthFile?.id || '',
    transactions,
    expenses,
    transfers,
    currentMonthFile
  );

  // New month modal
  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [newYear, setNewYear] = useState<number>(getLocalAccountingYear());
  const [newMonthNum, setNewMonthNum] = useState<number>(getLocalAccountingMonthNumber());

  // Finish month confirm modal
  const [finishConfirmMonth, setFinishConfirmMonth] = useState<MonthFile | null>(null);

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

  const handleCreateMonth = (e: React.FormEvent) => {
    e.preventDefault();
    const monthName = MONTH_NAMES[newMonthNum - 1];
    onCreateNewMonth(newYear, newMonthNum, monthName);
    setIsNewMonthModalOpen(false);
  };

  const handleFinishConfirm = () => {
    if (finishConfirmMonth) {
      onFinishMonth(finishConfirmMonth.id);
      setFinishConfirmMonth(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-blue-600" /> Monthly Accounting File System
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organized folder structure. Each month maintains isolated, chronological financial records.
          </p>
        </div>

        <button
          onClick={() => setIsNewMonthModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" /> + CREATE NEW MONTH FILE
        </button>
      </div>

      {/* MONTHLY FILE HEADER / SUMMARY CARD (Requirement 5) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                ACTIVE MONTH FILE SUMMARY
              </span>
              <h2 className="text-xl font-bold text-white">
                {currentMonthFile?.monthName} {currentMonthFile?.year} Folder
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentMonthFile?.status === 'active' ? (
              <button
                onClick={() => setFinishConfirmMonth(currentMonthFile)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" /> FINISH & LOCK MONTH
              </button>
            ) : (
              <button
                onClick={() => onReopenMonth(currentMonthFile?.id || '')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-4 h-4" /> Reopen Closed Month
              </button>
            )}

            <button
              onClick={() => onNavigateToReport(currentMonthFile?.id || '')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
            >
              View Month Report &rarr;
            </button>
          </div>
        </div>

        {/* 7 Summary Figures */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Sales</span>
            <strong className="text-sm font-bold text-white block mt-1">
              {formatCurrency(monthTotals.totalSales, currency)}
            </strong>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Received</span>
            <strong className="text-sm font-bold text-emerald-400 block mt-1">
              {formatCurrency(monthTotals.totalReceived, currency)}
            </strong>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Pending</span>
            <strong className="text-sm font-bold text-amber-400 block mt-1">
              {formatCurrency(monthTotals.totalPending, currency)}
            </strong>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Expenses</span>
            <strong className="text-sm font-bold text-rose-400 block mt-1">
              {formatCurrency(monthTotals.totalExpenses, currency)}
            </strong>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Cash Balance</span>
            <strong className="text-sm font-bold text-emerald-300 block mt-1">
              {formatCurrency(monthTotals.cashBalance, currency)}
            </strong>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Bank Balance</span>
            <strong className="text-sm font-bold text-blue-300 block mt-1">
              {formatCurrency(monthTotals.bankBalance, currency)}
            </strong>
          </div>

          <div className="bg-blue-600/30 p-3 rounded-xl border border-blue-500/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-blue-300 uppercase block">Total Available</span>
            <strong className="text-sm font-black text-white block mt-1">
              {formatCurrency(monthTotals.totalAvailableBalance, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Monthly Files Folder Explorer List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" /> Accounting File Explorer Directory
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((m) => {
            const isSelected = m.id === activeMonthId;
            const mTotals = calculateMonthTotals(m.id, transactions, expenses, transfers, m);

            return (
              <div
                key={m.id}
                onClick={() => onSelectMonth(m.id)}
                className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Folder
                        className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                      />
                      <h4 className="font-bold text-slate-900 text-sm">
                        {m.monthName} {m.year}
                      </h4>
                    </div>

                    {m.status === 'closed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        <Lock className="w-3 h-3 text-slate-500" /> Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        🟢 Active
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span>Total Sales:</span>
                      <strong className="text-slate-900">{formatCurrency(mTotals.totalSales, currency)}</strong>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Total Received:</span>
                      <span>{formatCurrency(mTotals.totalReceived, currency)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Expenses:</span>
                      <span>{formatCurrency(mTotals.totalExpenses, currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                      <span>Available Money:</span>
                      <span className="text-blue-700">{formatCurrency(mTotals.totalAvailableBalance, currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {transactions.filter((t) => t.monthId === m.id).length} Invoices
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToReport(m.id);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1"
                  >
                    View Report &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create New Month Modal */}
      {isNewMonthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-600" /> Create New Monthly File
            </h3>

            <form onSubmit={handleCreateMonth} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">
                  Select Year
                </label>
                <input
                  type="number"
                  required
                  min="2020"
                  max="2035"
                  value={newYear}
                  onChange={(e) => setNewYear(parseInt(e.target.value) || 2026)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">
                  Select Month
                </label>
                <select
                  value={newMonthNum}
                  onChange={(e) => setNewMonthNum(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name} ({idx + 1})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-slate-700 text-xs">
                Creating a new month will set up an isolated file folder. Opening cash and bank balances will automatically carry forward if applicable.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMonthModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm"
                >
                  Create Month File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finish Month Confirmation Modal */}
      {finishConfirmMonth && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-2 text-amber-600 font-bold">
              <AlertTriangle className="w-5 h-5" /> Confirm Finish & Lock Month
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Finish <strong>{finishConfirmMonth.monthName} {finishConfirmMonth.year}</strong>?
              <br /><br />
              This will:
              <br />
              1. Lock this month file from accidental changes.
              <br />
              2. Generate the final monthly report.
              <br />
              3. Automatically create the next month's accounting file.
              <br />
              4. Automatically carry forward closing Cash & Bank balances as opening balances.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setFinishConfirmMonth(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishConfirm}
                className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Yes, Finish & Lock Month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
