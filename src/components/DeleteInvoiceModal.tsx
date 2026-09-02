import React, { useState, useEffect } from 'react';
import { Transaction, BusinessProfile } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { verifyPassword } from '../lib/crypto';
import {
  AlertTriangle,
  X,
  Trash2,
  Ban,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';

interface DeleteInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  passwordHash: string | null;
  businessProfile: BusinessProfile | null;
  onConfirmDelete: (tx: Transaction, providedPassword?: string) => boolean | void;
  onConfirmVoid: (tx: Transaction, reason: string, providedPassword?: string) => boolean | void;
}

export const DeleteInvoiceModal: React.FC<DeleteInvoiceModalProps> = ({
  isOpen,
  onClose,
  transaction,
  passwordHash,
  businessProfile,
  onConfirmDelete,
  onConfirmVoid,
}) => {
  const [password, setPassword] = useState('');
  const [voidReason, setVoidReason] = useState('Cancelled by customer');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'delete' | 'void'>('delete');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setVoidReason('Cancelled by customer');
      setErrorMessage('');
      setActiveTab('delete');
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const currency = businessProfile?.currencySymbol || '$';

  const handleAction = (actionType: 'void' | 'delete') => {
    setErrorMessage('');

    // Check password if set
    if (passwordHash) {
      if (!password) {
        setErrorMessage('Please enter your software password to authorize invoice deletion.');
        return;
      }
      if (!verifyPassword(password, passwordHash)) {
        setErrorMessage('Incorrect password. Invoice was not deleted.');
        return;
      }
    }

    if (actionType === 'void') {
      const result = onConfirmVoid(transaction, voidReason || 'Voided by user', password);
      if (result !== false) {
        onClose();
      }
    } else {
      const result = onConfirmDelete(transaction, password);
      if (result !== false) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-red-200 dark:border-red-900/60 overflow-hidden my-auto space-y-0 text-slate-800 dark:text-slate-200">
        {/* Modal Header */}
        <div className="bg-red-700 dark:bg-red-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-200" />
            <div>
              <h2 className="font-bold text-base uppercase tracking-wide">
                Invoice Action: {transaction.invoiceNumber}
              </h2>
              <p className="text-xs text-red-100">
                Authorized financial adjustment & accounting safety
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-800 dark:hover:bg-red-900 rounded-lg text-red-100 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toggle Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('void')}
            className={`flex-1 py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'void'
                ? 'border-amber-600 dark:border-amber-400 text-amber-900 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Ban className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>VOID INVOICE (RECOMMENDED)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delete')}
            className={`flex-1 py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'delete'
                ? 'border-red-600 dark:border-red-400 text-red-900 dark:text-red-300 bg-red-50/60 dark:bg-red-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>DELETE PERMANENTLY</span>
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-800 dark:text-slate-200">
          {/* Warning Message */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              <strong>Are you sure you want to {activeTab === 'void' ? 'void' : 'delete'} this invoice?</strong>
              <br />
              This action will affect sales totals, payments received, cash & bank balances, customer statements, and monthly/yearly reports.
            </p>
          </div>

          {/* Invoice Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex justify-between items-center font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-mono text-blue-600 dark:text-blue-400">{transaction.invoiceNumber}</span>
              <span>{formatDate(transaction.date)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400 dark:text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{transaction.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block text-[10px] uppercase font-bold">Line Items</span>
                <span className="font-medium">{transaction.items?.length || 0} items</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block text-[10px] uppercase font-bold">Total Bill</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatCurrency(transaction.grandTotal, currency)}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block text-[10px] uppercase font-bold">Received / Pending</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(transaction.totalReceived, currency)}
                </span>
                {transaction.pendingAmount > 0 && (
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 ml-1">
                    ({formatCurrency(transaction.pendingAmount, currency)} pending)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Void Reason (if void tab active) */}
          {activeTab === 'void' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Reason for Voiding / Cancelling *
              </label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 font-medium text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="Cancelled by customer">Cancelled by customer</option>
                <option value="Incorrect pricing / billing error">Incorrect pricing / billing error</option>
                <option value="Duplicate entry">Duplicate entry</option>
                <option value="Order rejected / Quality issue">Order rejected / Quality issue</option>
                <option value="Test / Sample invoice">Test / Sample invoice</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          {/* Password Security Verification */}
          {passwordHash && (
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-red-600 dark:text-red-400" /> Security Authorization Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Enter current software password..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Password verification is required before adjusting accounting ledger records.
              </p>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300 dark:border-slate-700 uppercase tracking-wider"
            >
              CANCEL
            </button>

            {activeTab === 'void' ? (
              <button
                type="button"
                onClick={() => handleAction('void')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <Ban className="w-4 h-4" />
                <span>CONFIRM VOID INVOICE</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAction('delete')}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <Trash2 className="w-4 h-4" />
                <span>CONFIRM DELETE INVOICE</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
