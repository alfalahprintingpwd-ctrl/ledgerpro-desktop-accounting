import React from 'react';
import { MonthFile, BusinessProfile } from '../types';
import { formatCurrency, formatDate, useLocalDateWatcher } from '../lib/utils';
import { Plus, FolderTree, Search, Wallet, Lock, Building, Calendar, X, Globe } from 'lucide-react';

interface TopHeaderProps {
  activeMonth: MonthFile | undefined;
  months: MonthFile[];
  onSelectMonth: (monthId: string) => void;
  onOpenNewSalesModal: () => void;
  onOpenNewExpenseModal: () => void;
  totalAvailableMoney: number;
  cashBalance: number;
  bankBalance: number;
  businessProfile: BusinessProfile | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeMonth,
  months,
  onSelectMonth,
  onOpenNewSalesModal,
  onOpenNewExpenseModal,
  totalAvailableMoney,
  cashBalance,
  bankBalance,
  businessProfile,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const { currentDate, timeZone } = useLocalDateWatcher();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (onSearchSubmit) onSearchSubmit();
    } else if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
      {/* Left: Active Month File selector & Quick Search */}
      <div className="flex items-center gap-3">
        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg border border-slate-200 transition">
          <FolderTree className="w-4 h-4 text-blue-600" />
          <div className="text-xs">
            <span className="text-slate-500 font-medium block text-[10px] uppercase leading-none">Active Month File</span>
            <select
              value={activeMonth?.id || ''}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
            >
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.monthName} {m.year} {m.status === 'closed' ? '(Closed)' : '(Active)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-56 lg:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="main-search-input"
            type="text"
            placeholder="Search customer, invoice #, contact #... (Ctrl+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
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

      {/* Right: Balance Quick Summary & Actions */}
      <div className="flex items-center gap-3">
        {/* Available Money pill */}
        <div className="hidden sm:flex items-center gap-4 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash: <strong className="text-slate-900">{formatCurrency(cashBalance, currency)}</strong></span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>Bank: <strong className="text-slate-900">{formatCurrency(bankBalance, currency)}</strong></span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="text-xs text-slate-600 font-semibold">
            Total: <span className="text-blue-700">{formatCurrency(totalAvailableMoney, currency)}</span>
          </div>
        </div>

        {/* Local Timezone & Today's Date Pill */}
        <div
          title={`Automatic Local System Timezone: ${timeZone}`}
          className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{formatDate(currentDate)}</span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{timeZone}</span>
        </div>

        {/* Buttons */}
        <button
          onClick={onOpenNewExpenseModal}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-red-600" />
          <span>+ Expense</span>
        </button>

        <button
          onClick={onOpenNewSalesModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ CREATE NEW ENTRY</span>
        </button>
      </div>
    </header>
  );
};
