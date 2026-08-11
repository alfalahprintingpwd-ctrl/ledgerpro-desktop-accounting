import React, { useState, useEffect } from 'react';
import { Transaction, MonthFile, BusinessProfile } from '../types';
import { formatDate, formatCurrency, getLocalAccountingDate } from '../lib/utils';
import {
  Search,
  Filter,
  Plus,
  Printer,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Receipt,
  FileSpreadsheet,
  X,
  Calendar,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface SalesEntriesProps {
  activeMonth: MonthFile | undefined;
  transactions: Transaction[];
  businessProfile: BusinessProfile | null;
  months?: MonthFile[];
  onOpenNewSalesModal: () => void;
  onViewInvoice: (tx: Transaction) => void;
  onEditSalesModal: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterTransactions?: (txList: Transaction[], query: string) => Transaction[];
}

export const SalesEntries: React.FC<SalesEntriesProps> = ({
  activeMonth,
  transactions,
  businessProfile,
  months = [],
  onOpenNewSalesModal,
  onViewInvoice,
  onEditSalesModal,
  onDeleteTransaction,
  searchQuery,
  setSearchQuery,
  filterTransactions,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const monthId = activeMonth?.id || '';

  // Filter states
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'pending' | 'paid' | 'cash' | 'bank'>('all');
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<Transaction | null>(null);

  // Global ESC key listener to clear search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, setSearchQuery]);

  // Determine base list of transactions:
  // If searchQuery is present, search across ALL transactions in database.
  // Otherwise, filter by active month.
  const isSearchActive = searchQuery.trim().length > 0;
  
  const baseList = isSearchActive
    ? (filterTransactions ? filterTransactions(transactions, searchQuery) : transactions)
    : transactions.filter((t) => t.monthId === monthId);

  const todayStr = getLocalAccountingDate();

  const filteredTx = baseList.filter((tx) => {
    // If not using filterTransactions helper, perform inline matching
    if (isSearchActive && !filterTransactions) {
      const q = searchQuery.toLowerCase().trim();
      const cleanPhoneQuery = q.replace(/[^0-9]/g, '');

      const matchInv = tx.invoiceNumber.toLowerCase().includes(q);
      const matchCustomer = tx.customerName.toLowerCase().includes(q);
      const phoneLower = (tx.customerPhone || '').toLowerCase();
      const cleanPhone = phoneLower.replace(/[^0-9]/g, '');
      const matchPhone =
        phoneLower.includes(q) ||
        (cleanPhoneQuery.length >= 3 && cleanPhone.includes(cleanPhoneQuery));
      const matchItem = tx.items.some(
        (i) => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q))
      );
      if (!matchInv && !matchCustomer && !matchPhone && !matchItem) return false;
    }

    // Filter pills
    if (dateRangeFilter === 'today' && tx.date !== todayStr) return false;
    if (dateRangeFilter === 'pending' && tx.pendingAmount <= 0) return false;
    if (dateRangeFilter === 'paid' && tx.pendingAmount > 0) return false;
    if (dateRangeFilter === 'cash' && tx.cashReceived <= 0) return false;
    if (dateRangeFilter === 'bank' && tx.bankReceived <= 0) return false;

    return true;
  });

  // Calculate totals for filtered view
  const filteredTotalSales = filteredTx.reduce((sum, t) => sum + (t.isVoided ? 0 : t.grandTotal), 0);
  const filteredTotalReceived = filteredTx.reduce((sum, t) => sum + (t.isVoided ? 0 : t.totalReceived), 0);
  const filteredTotalPending = filteredTx.reduce((sum, t) => sum + (t.isVoided ? 0 : t.pendingAmount), 0);

  // Helper to map monthId to month name
  const getMonthLabel = (mId: string) => {
    const found = months.find((m) => m.id === mId);
    if (found) return `${found.monthName} ${found.year}`;
    if (mId && mId.length === 7) {
      const [y, m] = mId.split('-');
      return `${m}/${y}`;
    }
    return '';
  };

  const activeMonthTxCount = transactions.filter((t) => t.monthId === monthId).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" /> Sales & Customer Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Month: <strong className="text-slate-800">{activeMonth?.monthName} {activeMonth?.year}</strong> • {filteredTx.length} Transactions listed
            {isSearchActive && (
              <span className="ml-2 font-semibold text-blue-600">(Global Search Active across all records)</span>
            )}
          </p>
        </div>

        <button
          onClick={onOpenNewSalesModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> + CREATE NEW ENTRY
        </button>
      </div>

      {/* FILTER ACTIVE Banner */}
      {isSearchActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider animate-pulse">
              FILTER ACTIVE
            </span>
            <div className="text-xs text-slate-800 font-medium">
              Showing <strong className="text-blue-700 font-bold">{filteredTx.length} invoice(s)</strong> found matching <span className="bg-white px-2 py-0.5 rounded border border-blue-200 font-mono font-bold text-slate-900">"{searchQuery}"</span> across all accounting records.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>CLEAR SEARCH</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal ml-0.5">(Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter:
          </span>

          <button
            onClick={() => setDateRangeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              dateRangeFilter === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All {isSearchActive ? 'Results' : 'Month'} ({filteredTx.length})
          </button>

          <button
            onClick={() => setDateRangeFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              dateRangeFilter === 'today'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today's
          </button>

          <button
            onClick={() => setDateRangeFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              dateRangeFilter === 'pending'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Pending Receivables
          </button>

          <button
            onClick={() => setDateRangeFilter('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              dateRangeFilter === 'paid'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Fully Paid
          </button>

          <button
            onClick={() => setDateRangeFilter('cash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              dateRangeFilter === 'cash'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cash Transactions
          </button>

          <button
            onClick={() => setDateRangeFilter('bank')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              dateRangeFilter === 'bank'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Bank Transactions
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice, customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchQuery('');
            }}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              title="Clear search (Esc)"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-blue-700 block">
              {isSearchActive ? 'Filtered Total Sales' : 'Total Month Sales'}
            </span>
            <strong className="text-xl font-bold text-slate-900">{formatCurrency(filteredTotalSales, currency)}</strong>
          </div>
          <Receipt className="w-6 h-6 text-blue-500" />
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">
              {isSearchActive ? 'Filtered Received Amount' : 'Total Received'}
            </span>
            <strong className="text-xl font-bold text-emerald-800">{formatCurrency(filteredTotalReceived, currency)}</strong>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-amber-700 block">
              {isSearchActive ? 'Filtered Pending Amount' : 'Total Pending'}
            </span>
            <strong className="text-xl font-bold text-amber-800">{formatCurrency(filteredTotalPending, currency)}</strong>
          </div>
          <Clock className="w-6 h-6 text-amber-500" />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {filteredTx.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No matching invoices or entries found.</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isSearchActive
                ? `No sales records matched your search query "${searchQuery}". Check the spelling, invoice number, or contact phone.`
                : 'No sales entries found for this month or selected filter pill.'}
            </p>
            {isSearchActive && (
              <div className="pt-2">
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> CLEAR SEARCH
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date / Month</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Work / Products</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-right">Received</th>
                  <th className="py-3 px-4 text-right">Pending</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTx.map((tx) => {
                  const isVoided = tx.isVoided || tx.status === 'voided';
                  const monthLabel = getMonthLabel(tx.monthId);
                  const isDifferentMonth = tx.monthId !== monthId;

                  return (
                    <tr key={tx.id} className={`hover:bg-slate-50 transition ${isVoided ? 'bg-red-50/40 opacity-75' : ''}`}>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={isVoided ? 'line-through text-slate-500' : 'text-blue-600'}>
                          {tx.invoiceNumber}
                        </span>
                        {isVoided && (
                          <span className="block text-[9px] font-extrabold text-red-600 uppercase tracking-wide bg-red-100 px-1.5 py-0.5 rounded w-max mt-0.5">
                            VOIDED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{formatDate(tx.date)}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>{tx.day}</span>
                          {monthLabel && (
                            <span className={`px-1 rounded text-[9px] font-semibold ${isDifferentMonth ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-400'}`}>
                              • {monthLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{tx.customerName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.customerPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="truncate font-medium text-slate-800">
                          {tx.items.map((i) => i.name).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {tx.items.length} line item(s)
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        <span className={isVoided ? 'line-through text-slate-400' : ''}>
                          {formatCurrency(tx.grandTotal, currency)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                        <span className={isVoided ? 'line-through text-slate-400' : ''}>
                          {formatCurrency(tx.totalReceived, currency)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {isVoided ? (
                          <span className="text-red-500 font-bold text-[10px]">REVERSED</span>
                        ) : tx.pendingAmount > 0 ? (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {formatCurrency(tx.pendingAmount, currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Paid</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewInvoice(tx)}
                            title="View / Print Invoice"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditSalesModal(tx)}
                            title="Edit Invoice Entry"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx)}
                            title="Delete or Void Invoice"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Floating New Entry Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onOpenNewSalesModal}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> + CREATE NEW ENTRY
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Confirm Transaction Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete transaction{' '}
              <strong className="text-blue-600">{deleteConfirmTx.invoiceNumber}</strong> for{' '}
              <strong>{deleteConfirmTx.customerName}</strong>?
              <br />
              This will automatically revert the sales totals, cash balance, and bank balance.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmTx(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteTransaction(deleteConfirmTx);
                  setDeleteConfirmTx(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg shadow-sm"
              >
                Yes, Delete Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

