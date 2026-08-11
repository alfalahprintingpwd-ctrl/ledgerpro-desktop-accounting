import React, { useState } from 'react';
import { Customer, Transaction, BusinessProfile } from '../types';
import { formatCurrency } from '../lib/utils';
import { Users, Search, Phone, MapPin, ArrowUpRight } from 'lucide-react';
import { CustomerStatementModal } from './CustomerStatementModal';

interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  businessProfile: BusinessProfile | null;
  onViewInvoice: (tx: Transaction) => void;
}

export const Customers: React.FC<CustomersProps> = ({
  customers,
  transactions,
  businessProfile,
  onViewInvoice,
}) => {
  const currency = businessProfile?.currencySymbol || '$';
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Customer Directory & Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {customers.length} Registered Customer accounts • Full ledger transaction history
          </p>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            No customer accounts found. Customers are automatically saved whenever a sale entry is created.
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{cust.name}</h3>
                  {cust.totalPending > 0 ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Pending Balance
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Clear Account
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 space-y-1 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.phone || 'No phone'}</span>
                  </div>
                  {cust.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 my-3 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Purchases:</span>
                    <strong className="text-slate-900">{formatCurrency(cust.totalPurchases, currency)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Total Paid:</span>
                    <strong>{formatCurrency(cust.totalPaid, currency)}</strong>
                  </div>
                  <div className="flex justify-between text-amber-700 font-bold border-t border-slate-200 pt-1">
                    <span>Pending Receivables:</span>
                    <span>{formatCurrency(cust.totalPending, currency)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(cust)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>View Complete Statement & Invoices</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Selected Customer Statement Modal */}
      <CustomerStatementModal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        transactions={transactions}
        businessProfile={businessProfile}
        onViewInvoice={onViewInvoice}
      />
    </div>
  );
};
