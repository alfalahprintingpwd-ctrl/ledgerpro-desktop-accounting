import React, { useState } from 'react';
import { Expense, ExpenseCategory, MonthFile, BusinessProfile, Employee } from '../types';
import {
  getDayName,
  formatDate,
  formatCurrency,
  getLocalAccountingDate,
  generateVoucherNumber,
  getLocalAccountingYear,
} from '../lib/utils';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Filter,
  Wallet,
  Building,
  Tag,
  X,
  FileBarChart,
  Receipt,
  User,
  CheckCircle2,
  Printer,
  Eye,
  FileText,
} from 'lucide-react';
import { ExpenseReportModal } from './ExpenseReportModal';
import { ExpenseVoucherModal } from './ExpenseVoucherModal';

interface ExpensesProps {
  activeMonth: MonthFile | undefined;
  expenses: Expense[];
  customCategories: ExpenseCategory[];
  businessProfile: BusinessProfile | null;
  employees?: Employee[];
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAddCustomCategory: (catName: string) => void;
}

export const Expenses: React.FC<ExpensesProps> = ({
  activeMonth,
  expenses,
  customCategories,
  businessProfile,
  employees = [],
  onSaveExpense,
  onDeleteExpense,
  onAddCustomCategory,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const monthId = activeMonth?.id || '';

  const monthExpenses = expenses.filter((e) => e.monthId === monthId);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Voucher Modal State
  const [selectedVoucherExpense, setSelectedVoucherExpense] = useState<Expense | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Success Notification / Quick Voucher prompt
  const [savedVoucherPrompt, setSavedVoucherPrompt] = useState<Expense | null>(null);

  // Form State
  const todayStr = getLocalAccountingDate();
  const [date, setDate] = useState(todayStr);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Printing Material');
  const [amount, setAmount] = useState<number>(0);
  const [paymentSource, setPaymentSource] = useState<'Cash' | 'Bank'>('Cash');
  const [madeBy, setMadeBy] = useState('');

  // Custom Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Delete State
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  // Filter State
  const [filterSource, setFilterSource] = useState<'all' | 'Cash' | 'Bank'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMadeBy, setFilterMadeBy] = useState<string>('all');

  const openNewModal = () => {
    setEditingExpense(null);
    setDate(getLocalAccountingDate());
    setTitle('');
    setDescription('');
    setCategory(customCategories[0]?.name || 'Printing Material');
    setAmount(0);
    setPaymentSource('Cash');
    setMadeBy(''); // Starts EMPTY for every new expense
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setTitle(exp.title);
    setDescription(exp.description || '');
    setCategory(exp.category);
    setAmount(exp.amount);
    setPaymentSource(exp.paymentSource);
    setMadeBy(exp.madeBy || '');
    setIsModalOpen(true);
  };

  const openVoucherModal = (exp: Expense) => {
    setSelectedVoucherExpense(exp);
    setIsVoucherModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter an expense title / description.');
      return;
    }
    if (amount <= 0) {
      alert('Expense amount must be greater than 0.');
      return;
    }

    const trimmedMadeBy = madeBy.trim();
    if (!trimmedMadeBy) {
      alert('Please enter the Responsible Person name.');
      return;
    }

    const expYear = parseInt(date.slice(0, 4), 10) || getLocalAccountingYear();
    
    // Auto-generate or preserve voucher number
    const voucherNumber =
      editingExpense?.voucherNumber ||
      generateVoucherNumber(businessProfile, expYear, expenses);

    // Find employee signature snapshot if registered employee name matches
    const matchedEmp = employees.find(
      (emp) => emp.name.trim().toLowerCase() === trimmedMadeBy.toLowerCase()
    );

    const exp: Expense = {
      id: editingExpense?.id || `exp_${Date.now()}`,
      voucherNumber,
      date,
      day: getDayName(date),
      monthId: activeMonthId(date),
      title: title.trim(),
      description: description.trim(),
      category,
      amount,
      paymentSource,
      madeBy: trimmedMadeBy,
      employeeId: matchedEmp?.id || editingExpense?.employeeId,
      ceoNameSnapshot: businessProfile?.ceoName,
      createdAt: editingExpense?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveExpense(exp);
    setIsModalOpen(false);

    // Prompt user to view / print voucher
    setSavedVoucherPrompt(exp);
  };

  const activeMonthId = (dateStr: string) => monthId || dateStr.slice(0, 7);

  const handleAddCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      onAddCustomCategory(newCatName.trim());
      setCategory(newCatName.trim());
      setNewCatName('');
      setIsCategoryModalOpen(false);
    }
  };

  // Filtered Expense list
  const filteredExpenses = monthExpenses.filter((e) => {
    if (filterSource !== 'all' && e.paymentSource !== filterSource) return false;
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterMadeBy !== 'all' && (e.madeBy || '').toLowerCase() !== filterMadeBy.toLowerCase()) {
      return false;
    }
    return true;
  });

  const totalFilteredExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Extract unique responsible persons for filter
  const uniquePersons = Array.from(new Set(monthExpenses.map((e) => e.madeBy).filter(Boolean)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-rose-600 dark:text-rose-400" /> Expense Management & Vouchers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Month: <strong className="text-slate-800 dark:text-slate-200">{activeMonth?.monthName} {activeMonth?.year}</strong> • {monthExpenses.length} Expense entries • Every expense includes an official printable voucher
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReportOpen(true)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileBarChart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Expense Audit Report & PDF
          </button>
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> + Add Category
          </button>
          <button
            onClick={openNewModal}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> + RECORD NEW EXPENSE
          </button>
        </div>
      </div>

      {/* Expense Saved Prompt Banner with Direct Generate Voucher Action */}
      {savedVoucherPrompt && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Expense Saved Successfully! Voucher #{savedVoucherPrompt.voucherNumber} Created.
              </p>
              <p className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                {savedVoucherPrompt.title} • {formatCurrency(savedVoucherPrompt.amount, currency)} • Made By: <strong>{savedVoucherPrompt.madeBy}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                openVoucherModal(savedVoucherPrompt);
                setSavedVoucherPrompt(null);
              }}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Receipt className="w-4 h-4 text-rose-400" />
              <span>VIEW / PRINT EXPENSE VOUCHER</span>
            </button>
            <button
              onClick={() => setSavedVoucherPrompt(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Payment Source:
          </span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as 'all' | 'Cash' | 'Bank')}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-100 outline-none"
          >
            <option value="all">All Sources (Cash + Bank)</option>
            <option value="Cash">Cash Expenses</option>
            <option value="Bank">Bank Expenses</option>
          </select>

          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-2">Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-100 outline-none"
          >
            <option value="all">All Categories</option>
            {customCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          {uniquePersons.length > 0 && (
            <>
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-2">Made By:</span>
              <select
                value={filterMadeBy}
                onChange={(e) => setFilterMadeBy(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="all">All Responsible Persons</option>
                {uniquePersons.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold px-3.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60">
          Total Filtered Expense: {formatCurrency(totalFilteredExpense, currency)}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            No expenses recorded for this month matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date / Day</th>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Expense Title & Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Expense Made By</th>
                  <th className="py-3 px-4 text-center">Paid From</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="py-3.5 px-4 font-medium">
                      <div className="text-slate-900 dark:text-slate-100 font-mono">{formatDate(exp.date)}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{exp.day}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">
                        {exp.voucherNumber || `EXP-${exp.date.slice(0, 4)}-0001`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{exp.title}</span>
                      {exp.description && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-xs mt-0.5">
                          {exp.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{exp.madeBy || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {exp.paymentSource === 'Cash' ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 text-[10px]">
                          <Wallet className="w-3 h-3" /> Cash
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-800 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60 text-[10px]">
                          <Building className="w-3 h-3" /> Bank
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* VOUCHER BUTTON */}
                        <button
                          onClick={() => openVoucherModal(exp)}
                          title="Generate / View Official Expense Voucher"
                          className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] rounded-lg border border-rose-200 dark:border-rose-800/60 transition cursor-pointer flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Voucher</span>
                        </button>
                        <button
                          onClick={() => openEditModal(exp)}
                          title="Edit Expense"
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition cursor-pointer border border-transparent dark:border-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmExpense(exp)}
                          title="Delete Expense"
                          className="p-1.5 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer border border-transparent dark:border-red-800/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-400" />
                {editingExpense ? 'Edit Expense Entry' : 'Record New Expense Entry'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                    Day: {getDayName(date)}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg font-bold outline-none"
                  >
                    {customCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paper Stock Roll Purchase"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Description / Remarks / Vendor Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purchased 4 rolls from Master Paper Mill"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none"
                />
              </div>

              {/* Responsible Person / Expense Made By (Required) */}
              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Responsible Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type person's name here"
                  value={madeBy}
                  onChange={(e) => setMadeBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Payment Source *
                  </label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value as 'Cash' | 'Bank')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="Cash">Deduct from Cash Balance</option>
                    <option value="Bank">Deduct from Bank Balance</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense & Create Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Expense Entry?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete expense <strong>"{deleteConfirmExpense.title}"</strong> (Voucher: {deleteConfirmExpense.voucherNumber || 'N/A'}) of{' '}
              <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(deleteConfirmExpense.amount, currency)}</strong>?
              This will restore the deducted amount to your{' '}
              <strong className="text-slate-900 dark:text-slate-100">{deleteConfirmExpense.paymentSource}</strong> balance.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmExpense(null)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteExpense(deleteConfirmExpense.id);
                  setDeleteConfirmExpense(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Add Custom Expense Category
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCatSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Courier & Shipping"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Audit Report Modal */}
      <ExpenseReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        activeMonth={activeMonth}
        expenses={monthExpenses}
        customCategories={customCategories}
        businessProfile={businessProfile}
      />

      {/* Official Expense Voucher Modal */}
      <ExpenseVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        expense={selectedVoucherExpense}
        businessProfile={businessProfile}
        employees={employees}
        onEditExpense={(exp) => openEditModal(exp)}
      />
    </div>
  );
};
