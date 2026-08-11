import React, { useState, useEffect } from 'react';
import { Transaction, LineItem, Customer, BusinessProfile } from '../types';
import { getDayName, formatCurrency, generateInvoiceNumber, getLocalAccountingDate } from '../lib/utils';
import { X, Plus, Trash2, Calculator, Receipt, UserCheck } from 'lucide-react';
import { UnsavedChangesModal } from './UnsavedChangesModal';

interface NewSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  existingCustomers: Customer[];
  businessProfile: BusinessProfile | null;
  activeMonthId: string;
  editingTransaction?: Transaction | null;
}

export const NewSalesModal: React.FC<NewSalesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingCustomers,
  businessProfile,
  activeMonthId,
  editingTransaction,
}) => {
  const currency = businessProfile?.currencySymbol || '$';

  // Date & Day
  const todayStr = getLocalAccountingDate();
  const [date, setDate] = useState(editingTransaction?.date || todayStr);
  const [day, setDay] = useState(editingTransaction?.day || getDayName(todayStr));

  // Customer Info
  const [customerName, setCustomerName] = useState(editingTransaction?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(editingTransaction?.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(editingTransaction?.customerAddress || '');

  // Line items
  const [items, setItems] = useState<LineItem[]>(
    editingTransaction?.items || [
      { id: 'item_1', name: '', description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]
  );

  // Financials
  const [discount, setDiscount] = useState<number>(editingTransaction?.discount || 0);
  const [tax, setTax] = useState<number>(
    editingTransaction?.tax !== undefined
      ? editingTransaction.tax
      : (businessProfile?.defaultTaxRate || 0) > 0
      ? 0
      : 0
  );
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Split'>(
    editingTransaction?.paymentMethod || 'Cash'
  );
  const [cashReceived, setCashReceived] = useState<number>(editingTransaction?.cashReceived || 0);
  const [bankReceived, setBankReceived] = useState<number>(editingTransaction?.bankReceived || 0);
  const [notes, setNotes] = useState(editingTransaction?.notes || '');

  // Unsaved Changes Prompt
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  // Check if form has unsaved changes
  const hasUnsavedChanges = Boolean(
    customerName.trim() ||
      customerPhone.trim() ||
      customerAddress.trim() ||
      notes.trim() ||
      items.some((i) => i.name.trim() || i.unitPrice > 0 || i.quantity > 1)
  );

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  // Auto calculate day when date changes
  useEffect(() => {
    setDay(getDayName(date));
  }, [date]);

  // Sync state when modal is opened or editing transaction changes
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setDate(editingTransaction.date);
        setDay(editingTransaction.day || getDayName(editingTransaction.date));
        setCustomerName(editingTransaction.customerName || '');
        setCustomerPhone(editingTransaction.customerPhone || '');
        setCustomerAddress(editingTransaction.customerAddress || '');
        setItems(
          editingTransaction.items && editingTransaction.items.length > 0
            ? editingTransaction.items
            : [{ id: 'item_1', name: '', description: '', quantity: 1, unitPrice: 0, total: 0 }]
        );
        setDiscount(editingTransaction.discount || 0);
        setTax(editingTransaction.tax || 0);
        setPaymentMethod(editingTransaction.paymentMethod || 'Cash');
        setCashReceived(editingTransaction.cashReceived || 0);
        setBankReceived(editingTransaction.bankReceived || 0);
        setNotes(editingTransaction.notes || '');
      } else {
        const freshToday = getLocalAccountingDate();
        setDate(freshToday);
        setDay(getDayName(freshToday));
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setItems([{ id: 'item_1', name: '', description: '', quantity: 1, unitPrice: 0, total: 0 }]);
        setDiscount(0);
        setTax((businessProfile?.defaultTaxRate || 0) > 0 ? 0 : 0);
        setPaymentMethod('Cash');
        setCashReceived(0);
        setBankReceived(0);
        setNotes('');
      }
    }
  }, [isOpen, editingTransaction]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const grandTotal = Math.max(0, subtotal - (discount || 0) + (tax || 0));

  // Auto match default received if user changes grandTotal and not in split mode
  useEffect(() => {
    if (isOpen && !editingTransaction) {
      if (paymentMethod === 'Cash') setCashReceived(grandTotal);
      if (paymentMethod === 'Bank') setBankReceived(grandTotal);
    }
  }, [isOpen, grandTotal, editingTransaction, paymentMethod]);

  if (!isOpen) return null;

  // Handle line item update
  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    // Recalculate line total if qty or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const q = Number(field === 'quantity' ? value : current.quantity) || 0;
      const p = Number(field === 'unitPrice' ? value : current.unitPrice) || 0;
      current.total = q * p;
    }

    updated[index] = current;
    setItems(updated);
  };

  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item_${Date.now()}`, name: '', description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Select customer from dropdown autocomplete
  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    if (c.address) setCustomerAddress(c.address);
  };

  // Adjust cash/bank default based on payment method
  const handlePaymentMethodChange = (method: 'Cash' | 'Bank' | 'Split') => {
    setPaymentMethod(method);
    if (method === 'Cash') {
      setCashReceived(grandTotal);
      setBankReceived(0);
    } else if (method === 'Bank') {
      setCashReceived(0);
      setBankReceived(grandTotal);
    }
  };

  const totalReceived = (cashReceived || 0) + (bankReceived || 0);
  const pendingAmount = Math.max(0, grandTotal - totalReceived);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('Please enter Customer Name');
      return;
    }
    if (items.some((it) => !it.name.trim())) {
      alert('Please enter Product/Service Name for all line items');
      return;
    }

    const year = Number(date.slice(0, 4)) || 2026;
    const invNumber =
      editingTransaction?.invoiceNumber ||
      generateInvoiceNumber(
        businessProfile || {
          name: '',
          address: '',
          phone: '',
          email: '',
          ceoName: '',
          invoicePrefix: 'INV-',
          nextInvoiceSeq: 1001,
          currencySymbol: '$',
          defaultTaxRate: 0,
          invoiceFooterNote: '',
          autoLockMinutes: 0,
        },
        year
      );

    const transaction: Transaction = {
      id: editingTransaction?.id || `tx_${Date.now()}`,
      invoiceNumber: invNumber,
      date,
      day,
      monthId: date.slice(0, 7),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      items,
      subtotal,
      discount: discount || 0,
      tax: tax || 0,
      grandTotal,
      cashReceived: cashReceived || 0,
      bankReceived: bankReceived || 0,
      totalReceived,
      pendingAmount,
      paymentMethod,
      notes: notes.trim(),
      businessSnapshot: editingTransaction?.businessSnapshot || (businessProfile ? { ...businessProfile } : undefined),
      createdAt: editingTransaction?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(transaction);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base">
              {editingTransaction ? `Edit Sale Entry (${editingTransaction.invoiceNumber})` : 'New Sales & Invoice Entry'}
            </h2>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          {/* Date & Customer Info Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1">
                Day (Auto Calculated)
              </label>
              <input
                type="text"
                readOnly
                value={day}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1 flex items-center justify-between">
                <span>Customer Name *</span>
                {existingCustomers.length > 0 && (
                  <span className="text-[10px] text-blue-600 font-normal">Select existing or type new</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Corporate Solutions"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Select Customer Pill List */}
          {existingCustomers.length > 0 && !editingTransaction && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-600" /> Quick Customer:
              </span>
              {existingCustomers.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCustomer(c)}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-full text-[11px] border border-blue-200 transition"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Customer Phone & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1">
                Customer Phone Number
              </label>
              <input
                type="text"
                placeholder="+92 300 1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1">
                Customer Address
              </label>
              <input
                type="text"
                placeholder="Street address or city"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
              <span>Products / Services Table</span>
              <button
                type="button"
                onClick={addLineItem}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Product Line
              </button>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-1/3">Item / Service Name</th>
                  <th className="py-2 px-3 w-1/3">Description</th>
                  <th className="py-2 px-3 w-20 text-center">Qty</th>
                  <th className="py-2 px-3 w-28 text-right">Unit Price</th>
                  <th className="py-2 px-3 w-28 text-right">Total</th>
                  <th className="py-2 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Brochure Printing"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="e.g. 150gsm Glossy paper 1000pcs"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded outline-none focus:border-blue-500 text-slate-600"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-center outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-right outline-none focus:border-blue-500 font-mono"
                      />
                    </td>
                    <td className="p-2 text-right font-bold text-slate-800 font-mono">
                      {formatCurrency(item.total, currency)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal, Discount, Tax & Grand Total */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Notes */}
            <div>
              <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1">
                Transaction / Delivery Notes
              </label>
              <textarea
                rows={3}
                placeholder="Special remarks, delivery terms, or PO number..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
            </div>

            {/* Calculations Summary */}
            <div className="space-y-2 text-right">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold font-mono text-slate-900">{formatCurrency(subtotal, currency)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Discount:</span>
                <div className="flex items-center gap-1 justify-end w-32">
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-right font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Tax:</span>
                <div className="flex items-center gap-1 justify-end w-32">
                  <span className="text-slate-400">+</span>
                  <input
                    type="number"
                    min="0"
                    value={tax}
                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-right font-mono outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-base font-bold text-slate-900">
                <span>Grand Total Bill:</span>
                <span className="text-blue-700 font-mono text-lg">{formatCurrency(grandTotal, currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment & Split Receiving Details */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-4">
            <h3 className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
              <Calculator className="w-4 h-4 text-blue-600" /> Payment & Receiving Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    handlePaymentMethodChange(e.target.value as 'Cash' | 'Bank' | 'Split')
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none"
                >
                  <option value="Cash">Full Cash Payment</option>
                  <option value="Bank">Full Bank Transfer</option>
                  <option value="Split">Split Payment (Cash + Bank)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1">
                  Cash Received Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cashReceived}
                  disabled={paymentMethod === 'Bank'}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase text-[10px] mb-1">
                  Bank / Account Received Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={bankReceived}
                  disabled={paymentMethod === 'Cash'}
                  onChange={(e) => setBankReceived(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Pending Amount Auto Calculated Badge */}
            <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Received</span>
                  <strong className="text-emerald-700 font-mono text-sm">{formatCurrency(totalReceived, currency)}</strong>
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Pending Balance</span>
                  <strong
                    className={`font-mono text-sm ${
                      pendingAmount > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {formatCurrency(pendingAmount, currency)}
                  </strong>
                </div>
              </div>

              {pendingAmount > 0 && (
                <div className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full mt-2 sm:mt-0">
                  ⚠️ Rs. {pendingAmount.toLocaleString()} pending receivables
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>Save & Generate Invoice (Ctrl+S)</span>
            </button>
          </div>
        </form>
      </div>

      <UnsavedChangesModal
        isOpen={showUnsavedPrompt}
        onSave={() => {
          setShowUnsavedPrompt(false);
          // Trigger form submission
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSubmit(fakeEvent);
        }}
        onDiscard={() => {
          setShowUnsavedPrompt(false);
          onClose();
        }}
        onCancel={() => {
          setShowUnsavedPrompt(false);
        }}
      />
    </div>
  );
};
