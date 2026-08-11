import React, { useState } from 'react';
import { Expense, ExpenseCategory, MonthFile, BusinessProfile } from '../types';
import { getDayName, formatDate, formatCurrency, getLocalAccountingDate } from '../lib/utils';
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
} from 'lucide-react';
import { ExpenseReportModal } from './ExpenseReportModal';

interface ExpensesProps {
  activeMonth: MonthFile | undefined;
  expenses: Expense[];
  customCategories: ExpenseCategory[];
  businessProfile: BusinessProfile | null;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAddCustomCategory: (catName: string) => void;
}

export const Expenses: React.FC<ExpensesProps> = ({
  activeMonth,
  expenses,
  customCategories,
  businessProfile,
  onSaveExpense,
  onDeleteExpense,
  onAddCustomCategory,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const monthId = activeMonth?.id || '';

  const monthExpenses = expenses.filter((e) => e.monthId === monthId);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Form State
  const todayStr = getLocalAccountingDate();
  const [date, setDate] = useState(todayStr);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Printing Material');
  const [amount, setAmount] = useState<number>(0);
  const [paymentSource, setPaymentSource] = useState<'Cash' | 'Bank'>('Cash');

  // Custom Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Delete State
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  // Filter State
  const [filterSource, setFilterSource] = useState<'all' | 'Cash' | 'Bank'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const openNewModal = () => {
    setEditingExpense(null);
    setDate(getLocalAccountingDate());
    setTitle('');
    setDescription('');
    setCategory(customCategories[0]?.name || 'Printing Material');
    setAmount(0);
    setPaymentSource('Cash');
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
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter expense title');
      return;
    }
    if (amount <= 0) {
      alert('Expense amount must be greater than 0');
      return;
    }

    const exp: Expense = {
      id: editingExpense?.id || `exp_${Date.now()}`,
      date,
      day: getDayName(date),
      monthId: activeMonthId(date),
      title: title.trim(),
      description: description.trim(),
      category,
      amount,
      paymentSource,
      createdAt: editingExpense?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveExpense(exp);
    setIsModalOpen(false);
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
    return true;
  });

  const totalFilteredExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-rose-600" /> Expense Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Month: <strong className="text-slate-800">{activeMonth?.monthName} {activeMonth?.year}</strong> • {monthExpenses.length} Expense entries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReportOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileBarChart className="w-3.5 h-3.5 text-rose-600" /> Expense Report & PDF
          </button>
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-blue-600" /> + Add Category
          </button>
          <button
            onClick={openNewModal}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + RECORD NEW EXPENSE
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> Payment Source:
          </span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as 'all' | 'Cash' | 'Bank')}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none"
          >
            <option value="all">All Sources (Cash + Bank)</option>
            <option value="Cash">Cash Expenses</option>
            <option value="Bank">Bank Expenses</option>
          </select>

          <span className="font-bold text-slate-500 uppercase tracking-wider ml-2">Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none"
          >
            <option value="all">All Categories</option>
            {customCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-rose-50 text-rose-800 font-bold px-3 py-1.5 rounded-lg border border-rose-200">
          Total Filtered Expense: {formatCurrency(totalFilteredExpense, currency)}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No expenses recorded for this month matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date / Day</th>
                  <th className="py-3 px-4">Expense Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Payment Source</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-medium">
                      <div className="text-slate-900">{formatDate(exp.date)}</div>
                      <div className="text-[10px] text-slate-400">{exp.day}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{exp.title}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-semibold border border-slate-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {exp.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {exp.paymentSource === 'Cash' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Wallet className="w-3 h-3" /> Cash
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <Building className="w-3 h-3" /> Bank
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(exp)}
                          title="Edit Expense"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmExpense(exp)}
                          title="Delete Expense"
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition cursor-pointer"
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

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
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

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold outline-none"
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
                <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paper Stock Roll Purchase"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  placeholder="Vendor name or description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                    Payment Source *
                  </label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value as 'Cash' | 'Bank')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none"
                  >
                    <option value="Cash">Deduct from Cash Balance</option>
                    <option value="Bank">Deduct from Bank Balance</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-md"
                >
                  Save Expense Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Report Modal */}
      <ExpenseReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        activeMonth={activeMonth}
        expenses={expenses}
        customCategories={customCategories}
        businessProfile={businessProfile}
      />

      {/* Add Custom Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Add New Expense Category</h3>
            <form onSubmit={handleAddCatSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Die Cutting Machinery"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Confirm Expense Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete expense <strong>"{deleteConfirmExpense.title}"</strong> (
              {formatCurrency(deleteConfirmExpense.amount, currency)})?
              <br />
              This will automatically restore the deducted {deleteConfirmExpense.paymentSource} balance.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmExpense(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteExpense(deleteConfirmExpense.id);
                  setDeleteConfirmExpense(null);
                }}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Yes, Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
