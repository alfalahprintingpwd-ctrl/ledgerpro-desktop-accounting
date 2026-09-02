import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, BusinessProfile, Employee } from '../types';
import {
  getDayName,
  getLocalAccountingDate,
  generateVoucherNumber,
  getLocalAccountingYear,
} from '../lib/utils';
import {
  CreditCard,
  X,
  Wallet,
  Building,
  User,
} from 'lucide-react';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  editingExpense: Expense | null;
  businessProfile: BusinessProfile | null;
  customCategories: ExpenseCategory[];
  employees: Employee[];
  expenses: Expense[];
  activeMonthId: string;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingExpense,
  businessProfile,
  customCategories,
  employees,
  expenses,
  activeMonthId,
}) => {
  const currency = businessProfile?.currencySymbol || '$';

  const [date, setDate] = useState(getLocalAccountingDate());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(customCategories[0]?.name || 'Printing Material');
  const [amount, setAmount] = useState<number>(0);
  const [paymentSource, setPaymentSource] = useState<'Cash' | 'Bank'>('Cash');
  const [madeBy, setMadeBy] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (editingExpense) {
      setDate(editingExpense.date);
      setTitle(editingExpense.title);
      setDescription(editingExpense.description || '');
      setCategory(editingExpense.category);
      setAmount(editingExpense.amount);
      setPaymentSource(editingExpense.paymentSource);
      setNotes(editingExpense.notes || '');
      setMadeBy(editingExpense.madeBy || '');
    } else {
      setDate(getLocalAccountingDate());
      setTitle('');
      setDescription('');
      setCategory(customCategories[0]?.name || 'Printing Material');
      setAmount(0);
      setPaymentSource('Cash');
      setNotes('');
      setMadeBy(''); // Starts EMPTY for new expenses
    }
  }, [isOpen, editingExpense, customCategories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
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
    const voucherNumber =
      editingExpense?.voucherNumber ||
      generateVoucherNumber(businessProfile, expYear, expenses);

    const matchedEmp = employees.find(
      (emp) => emp.name.trim().toLowerCase() === trimmedMadeBy.toLowerCase()
    );

    const expMonthId = activeMonthId || date.slice(0, 7);

    const exp: Expense = {
      id: editingExpense?.id || `exp_${Date.now()}`,
      voucherNumber,
      date,
      day: getDayName(date),
      monthId: expMonthId,
      title: title.trim(),
      description: description.trim(),
      category,
      amount,
      paymentSource,
      madeBy: trimmedMadeBy,
      employeeId: matchedEmp?.id || editingExpense?.employeeId,
      ceoNameSnapshot: businessProfile?.ceoName,
      notes: notes.trim() || undefined,
      createdAt: editingExpense?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(exp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-400" />
            {editingExpense ? 'Edit Expense Entry' : 'Record New Expense Entry'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
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
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
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
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-bold outline-none"
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
              Description / Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Purchased 5 rolls from Sunrise Suppliers for order #1024"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                Amount ({currency}) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                placeholder="0.00"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-bold text-rose-600 dark:text-rose-400 text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                Payment Source *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentSource('Cash')}
                  className={`py-2 text-center rounded-lg font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                    paymentSource === 'Cash'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Wallet className="w-3 h-3" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSource('Bank')}
                  className={`py-2 text-center rounded-lg font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                    paymentSource === 'Bank'
                      ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-400 text-blue-900 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building className="w-3 h-3" /> Bank
                </button>
              </div>
            </div>
          </div>

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
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
              Internal Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid in full via petty cash"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
