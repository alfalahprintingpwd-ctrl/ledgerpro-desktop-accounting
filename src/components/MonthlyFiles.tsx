import React, { useState } from 'react';
import { MonthFile, Transaction, Expense, CashBankTransfer, BusinessProfile } from '../types';
import { calculateMonthTotals, formatCurrency, getLocalAccountingYear, getLocalAccountingMonthNumber, getPreviousMonthFile } from '../lib/utils';
import { verifyPassword } from '../lib/crypto';
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
  Wallet,
  Building,
  DollarSign,
  Edit3,
  KeyRound,
  Layers,
} from 'lucide-react';

interface MonthlyFilesProps {
  months: MonthFile[];
  activeMonthId: string;
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
  passwordHash?: string;
  onSelectMonth: (monthId: string) => void;
  onCreateNewMonth: (year: number, monthNumber: number, monthName: string) => void;
  onFinishMonth: (monthId: string) => void;
  onReopenMonth: (monthId: string) => void;
  onNavigateToReport: (monthId: string) => void;
  onUpdateOpeningBalances?: (monthId: string, openingCash: number, openingBank: number) => void;
}

export const MonthlyFiles: React.FC<MonthlyFilesProps> = ({
  months,
  activeMonthId,
  transactions,
  expenses,
  transfers,
  businessProfile,
  passwordHash = '',
  onSelectMonth,
  onCreateNewMonth,
  onFinishMonth,
  onReopenMonth,
  onNavigateToReport,
  onUpdateOpeningBalances,
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

  const prevMonthForActive = currentMonthFile
    ? getPreviousMonthFile(currentMonthFile.id, months)
    : undefined;

  // New month modal
  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [newYear, setNewYear] = useState<number>(getLocalAccountingYear());
  const [newMonthNum, setNewMonthNum] = useState<number>(getLocalAccountingMonthNumber());

  // Finish month confirm modal
  const [finishConfirmMonth, setFinishConfirmMonth] = useState<MonthFile | null>(null);

  // Edit Opening Balance Modal
  const [editingOpeningMonth, setEditingOpeningMonth] = useState<MonthFile | null>(null);
  const [editOpeningCash, setEditOpeningCash] = useState<number>(0);
  const [editOpeningBank, setEditOpeningBank] = useState<number>(0);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

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

  const handleOpenEditOpeningModal = (m: MonthFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOpeningMonth(m);
    setEditOpeningCash(m.openingCash || 0);
    setEditOpeningBank(m.openingBank || 0);
    setAuthPassword('');
    setAuthError('');
  };

  const handleSaveOpeningBalances = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpeningMonth || !onUpdateOpeningBalances) return;

    if (passwordHash) {
      if (!authPassword) {
        setAuthError('Please enter your software password to authorize this adjustment.');
        return;
      }
      const isValid = verifyPassword(authPassword, passwordHash);
      if (!isValid) {
        setAuthError('Incorrect software password. Verification failed.');
        return;
      }
    }

    onUpdateOpeningBalances(editingOpeningMonth.id, editOpeningCash, editOpeningBank);
    setEditingOpeningMonth(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Monthly Accounting File System
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Isolated monthly files with automatic chronological carry-forward of Cash & Bank balances.
          </p>
        </div>

        <button
          onClick={() => setIsNewMonthModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" /> + CREATE NEW MONTH FILE
        </button>
      </div>

      {/* MONTHLY FILE HEADER / SUMMARY CARD */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  ACTIVE MONTH FILE SUMMARY
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentMonthFile?.status === 'closed'
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                      : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                  }`}
                >
                  {currentMonthFile?.status === 'closed' ? '🔒 Closed / Locked' : '🟢 Active Month'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">
                {currentMonthFile?.monthName} {currentMonthFile?.year} Folder
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {prevMonthForActive ? (
                  <>
                    Carried forward from <strong>{prevMonthForActive.monthName} {prevMonthForActive.year}</strong> closing balance ({formatCurrency(monthTotals.openingTotal, currency)})
                  </>
                ) : (
                  <>
                    Base Opening Capital: <strong>{formatCurrency(monthTotals.openingTotal, currency)}</strong> (Opening Cash: {formatCurrency(monthTotals.openingCash, currency)} | Opening Bank: {formatCurrency(monthTotals.openingBank, currency)})
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentMonthFile && (
              <button
                onClick={(e) => handleOpenEditOpeningModal(currentMonthFile, e)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Adjust base opening cash/bank balance"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Adjust Opening Balance
              </button>
            )}

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
              className="px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-semibold rounded-lg border border-blue-500/40 transition flex items-center gap-1.5 cursor-pointer"
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
            <span className="text-[10px] font-semibold text-emerald-400 uppercase block">Physical Cash</span>
            <strong className="text-sm font-bold text-emerald-300 block mt-1">
              {formatCurrency(monthTotals.cashBalance, currency)}
            </strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Op: {formatCurrency(monthTotals.openingCash, currency)}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-semibold text-blue-400 uppercase block">Account / Bank</span>
            <strong className="text-sm font-bold text-blue-300 block mt-1">
              {formatCurrency(monthTotals.bankBalance, currency)}
            </strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Op: {formatCurrency(monthTotals.openingBank, currency)}
            </span>
          </div>

          <div className="bg-blue-600/30 p-3 rounded-xl border border-blue-500/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-blue-300 uppercase block">Total Available</span>
            <strong className="text-sm font-black text-white block mt-1">
              {formatCurrency(monthTotals.totalAvailableBalance, currency)}
            </strong>
            <span className="text-[9px] text-blue-200/80 block mt-0.5">
              Cash + Account
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Files Folder Explorer List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Accounting Files Directory & Chronological Balance Ledger
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {months.length} Month Folder{months.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {months.map((m) => {
            const isSelected = m.id === activeMonthId;
            const mTotals = calculateMonthTotals(m.id, transactions, expenses, transfers, m);
            const priorMonth = getPreviousMonthFile(m.id, months);

            return (
              <div
                key={m.id}
                onClick={() => onSelectMonth(m.id)}
                className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 shadow-md ring-1 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {m.monthName} {m.year}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {priorMonth ? `Carried from ${priorMonth.monthName} ${priorMonth.year}` : 'Initial Accounting Base'}
                        </span>
                      </div>
                    </div>

                    {m.status === 'closed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        🟢 Active
                      </span>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <div className="flex justify-between text-[11px] pb-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400">Opening (Cash + Bank):</span>
                      <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(mTotals.openingTotal, currency)}</strong>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span>Total Sales:</span>
                      <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(mTotals.totalSales, currency)}</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      <span>Received Revenue:</span>
                      <span>+{formatCurrency(mTotals.totalReceived, currency)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                      <span>Total Expenses:</span>
                      <span>-{formatCurrency(mTotals.totalExpenses, currency)}</span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 space-y-1 text-[11px]">
                      <div className="flex justify-between text-emerald-800 dark:text-emerald-300">
                        <span>Cash Balance:</span>
                        <span className="font-bold">{formatCurrency(mTotals.cashBalance, currency)}</span>
                      </div>
                      <div className="flex justify-between text-blue-800 dark:text-blue-300">
                        <span>Account Balance:</span>
                        <span className="font-bold">{formatCurrency(mTotals.bankBalance, currency)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 dark:text-white font-black pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <span>Total Available Money:</span>
                        <span className="text-blue-600 dark:text-blue-400">{formatCurrency(mTotals.totalAvailableBalance, currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                    {transactions.filter((t) => t.monthId === m.id).length} Sales • {expenses.filter((e) => e.monthId === m.id).length} Expenses
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenEditOpeningModal(m, e)}
                      className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold flex items-center gap-1"
                      title="Edit Opening Balance"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToReport(m.id);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold text-xs flex items-center gap-1"
                    >
                      Report &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create New Month Modal */}
      {isNewMonthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Create New Monthly File
            </h3>

            <form onSubmit={handleCreateMonth} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Select Year
                </label>
                <input
                  type="number"
                  required
                  min="2020"
                  max="2035"
                  value={newYear}
                  onChange={(e) => setNewYear(parseInt(e.target.value) || 2026)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Select Month
                </label>
                <select
                  value={newMonthNum}
                  onChange={(e) => setNewMonthNum(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name} ({idx + 1})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-slate-700 dark:text-slate-300 text-xs">
                Creating a new month will automatically carry forward the closing Cash and Account balances from the chronological previous month.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMonthModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Create Month File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Base Opening Balance Modal */}
      {editingOpeningMonth && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-base">
              <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Adjust Opening Balances: {editingOpeningMonth.monthName} {editingOpeningMonth.year}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Set or adjust the base opening balances for this month. Any changes will automatically update subsequent months' carried-forward balances.
            </p>

            <form onSubmit={handleSaveOpeningBalances} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Opening Cash Balance ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editOpeningCash}
                  onChange={(e) => setEditOpeningCash(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Opening Account / Bank Balance ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editOpeningBank}
                  onChange={(e) => setEditOpeningBank(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between font-bold text-xs">
                <span>Total Opening Capital:</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(editOpeningCash + editOpeningBank, currency)}</span>
              </div>

              {passwordHash && (
                <div>
                  <label className="block font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Enter Main Software Password to Authorize
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      setAuthError('');
                    }}
                    placeholder="Enter software master password"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {authError && (
                    <p className="text-rose-600 dark:text-rose-400 text-[11px] mt-1 font-semibold">{authError}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOpeningMonth(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Save Opening Balances
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finish Month Confirmation Modal */}
      {finishConfirmMonth && (() => {
        const confirmTotals = calculateMonthTotals(
          finishConfirmMonth.id,
          transactions,
          expenses,
          transfers,
          finishConfirmMonth
        );
        const year = Number(finishConfirmMonth.id.slice(0, 4));
        const monthNum = Number(finishConfirmMonth.id.slice(5, 7));
        const nextMonthNum = monthNum === 12 ? 1 : monthNum + 1;
        const nextYear = monthNum === 12 ? year + 1 : year;
        const nextMonthName = MONTH_NAMES[nextMonthNum - 1];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-base">
                <AlertTriangle className="w-5 h-5" /> Confirm Finish & Lock Month: {finishConfirmMonth.monthName} {finishConfirmMonth.year}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 space-y-2 text-xs">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  Closing Balances to Carry Forward:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block">Closing Cash</span>
                    <strong className="text-sm font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                      {formatCurrency(confirmTotals.cashBalance, currency)}
                    </strong>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block">Closing Account / Bank</span>
                    <strong className="text-sm font-bold text-blue-700 dark:text-blue-400 block mt-0.5">
                      {formatCurrency(confirmTotals.bankBalance, currency)}
                    </strong>
                  </div>
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 pt-1">
                  &rarr; These closing balances will automatically become the <strong>Opening Balances for {nextMonthName} {nextYear}</strong>.
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This action will lock <strong>{finishConfirmMonth.monthName} {finishConfirmMonth.year}</strong> and switch the active workspace to <strong>{nextMonthName} {nextYear}</strong> with the carried-forward funds ready.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setFinishConfirmMonth(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinishConfirm}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Yes, Finish & Carry Forward Balances
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
