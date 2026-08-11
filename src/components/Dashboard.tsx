import React from 'react';
import { Transaction, Expense, CashBankTransfer, MonthFile, BusinessProfile } from '../types';
import { calculateMonthTotals, formatCurrency, formatDate, useLocalDateWatcher } from '../lib/utils';
import {
  TrendingUp,
  Receipt,
  Clock,
  CreditCard,
  Wallet,
  Building,
  DollarSign,
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardProps {
  activeMonth: MonthFile | undefined;
  transactions: Transaction[];
  expenses: Expense[];
  transfers: CashBankTransfer[];
  businessProfile: BusinessProfile | null;
  onOpenNewSalesModal: () => void;
  onOpenNewExpenseModal: () => void;
  onViewInvoice: (tx: Transaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeMonth,
  transactions,
  expenses,
  transfers,
  businessProfile,
  onOpenNewSalesModal,
  onOpenNewExpenseModal,
  onViewInvoice,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const monthId = activeMonth?.id || '';

  // Monthly totals
  const monthTotals = calculateMonthTotals(monthId, transactions, expenses, transfers, activeMonth);

  // Live Local Date & Timezone
  const { currentDate: todayStr, timeZone } = useLocalDateWatcher();
  const todayTx = transactions.filter((t) => t.date === todayStr);
  const todayExp = expenses.filter((e) => e.date === todayStr);

  const todaySales = todayTx.reduce((sum, t) => sum + t.grandTotal, 0);
  const todayReceived = todayTx.reduce((sum, t) => sum + t.totalReceived, 0);
  const todayPending = todayTx.reduce((sum, t) => sum + t.pendingAmount, 0);
  const todayExpenses = todayExp.reduce((sum, e) => sum + e.amount, 0);

  // Chart Data: Last 5 transactions in active month
  const monthTx = transactions.filter((t) => t.monthId === monthId);
  const recentTx = [...monthTx].reverse().slice(0, 5);

  // Recharts: Cash vs Bank Balance
  const pieData = [
    { name: 'Cash Balance', value: Math.max(0, monthTotals.cashBalance), color: '#10b981' },
    { name: 'Bank Balance', value: Math.max(0, monthTotals.bankBalance), color: '#2563eb' },
  ];

  // Recharts: Sales vs Expenses vs Received
  const barData = [
    {
      name: activeMonth?.monthName || 'Current Month',
      Sales: monthTotals.totalSales,
      Received: monthTotals.totalReceived,
      Expenses: monthTotals.totalExpenses,
      Pending: monthTotals.totalPending,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Month Notice */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" /> Financial Summary • {activeMonth?.monthName} {activeMonth?.year}
          </div>
          <h2 className="text-2xl font-bold">
            {businessProfile?.name || 'Business Accounting Dashboard'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Status: {activeMonth?.status === 'closed' ? '🔒 Locked Month' : '🟢 Active Month'} • Chronological ledger entries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewSalesModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Create Customer Sale
          </button>
          <button
            onClick={onOpenNewExpenseModal}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-red-400" /> + Add Expense
          </button>
        </div>
      </div>

      {/* Main Financial Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(monthTotals.totalSales, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{monthTotals.invoiceCount} Invoices generated this month</span>
          </div>
        </div>

        {/* Card 2: Total Received */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Received</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {formatCurrency(monthTotals.totalReceived, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cash: {formatCurrency(monthTotals.cashReceived, currency)} • Bank: {formatCurrency(monthTotals.bankReceived, currency)}
          </div>
        </div>

        {/* Card 3: Total Pending */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pending</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(monthTotals.totalPending, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Accounts Receivable / Uncollected Bills
          </div>
        </div>

        {/* Card 4: Total Expenses */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(monthTotals.totalExpenses, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Deducted automatically from Cash & Bank
          </div>
        </div>
      </div>

      {/* Cash, Bank & Available Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash Balance */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Physical Cash Balance</span>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-900">
            {formatCurrency(monthTotals.cashBalance, currency)}
          </div>
          <p className="text-xs text-emerald-700/80 mt-1">
            Opening Cash: {formatCurrency(monthTotals.openingCash, currency)}
          </p>
        </div>

        {/* Bank Balance */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Bank / Account Balance</span>
            <Building className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-blue-900">
            {formatCurrency(monthTotals.bankBalance, currency)}
          </div>
          <p className="text-xs text-blue-700/80 mt-1">
            Opening Bank: {formatCurrency(monthTotals.openingBank, currency)}
          </p>
        </div>

        {/* Total Available Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Available Money</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {formatCurrency(monthTotals.totalAvailableBalance, currency)}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Calculation: Cash Balance + Bank Balance
          </p>
        </div>
      </div>

      {/* Today's vs Month Summary Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Today's Activity Snapshot ({formatDate(todayStr)})
          </span>
          <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {timeZone}
          </span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Today's Sales</span>
            <strong className="text-base text-slate-900 font-bold block mt-0.5">
              {formatCurrency(todaySales, currency)}
            </strong>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Today's Received</span>
            <strong className="text-base text-emerald-700 font-bold block mt-0.5">
              {formatCurrency(todayReceived, currency)}
            </strong>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Today's Pending</span>
            <strong className="text-base text-amber-600 font-bold block mt-0.5">
              {formatCurrency(todayPending, currency)}
            </strong>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Today's Expenses</span>
            <strong className="text-base text-rose-600 font-bold block mt-0.5">
              {formatCurrency(todayExpenses, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Charts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            Monthly Financial Performance Overview
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                <Legend />
                <Bar dataKey="Sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash vs Bank Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-800 mb-2">
            Cash vs Bank Holdings
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-500 text-center border-t border-slate-100 pt-2">
            Gross Operating Profit: <strong className="text-emerald-700">{formatCurrency(monthTotals.grossOperatingResult, currency)}</strong>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">
            Recent Sales Transactions ({activeMonth?.monthName})
          </h3>
          <span className="text-xs text-slate-500">Showing last 5 entries</span>
        </div>

        {recentTx.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No customer sales recorded for this month yet. Click "+ Create Customer Sale" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Inv #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Total Bill</th>
                  <th className="py-2.5 px-3 text-right">Received</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{tx.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-600">{formatDate(tx.date)}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{tx.customerName}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(tx.grandTotal, currency)}</td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-semibold">{formatCurrency(tx.totalReceived, currency)}</td>
                    <td className="py-3 px-3 text-right font-semibold">
                      {tx.pendingAmount > 0 ? (
                        <span className="text-amber-600 font-bold">{formatCurrency(tx.pendingAmount, currency)}</span>
                      ) : (
                        <span className="text-slate-400">Paid</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onViewInvoice(tx)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition text-[11px] cursor-pointer"
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
