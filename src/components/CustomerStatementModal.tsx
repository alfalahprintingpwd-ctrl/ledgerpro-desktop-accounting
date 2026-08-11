import React, { useRef, useState } from 'react';
import { Customer, Transaction, BusinessProfile } from '../types';
import { formatDate, formatCurrency, formatDateTimePKT } from '../lib/utils';
import {
  X,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { downloadPdfFromElement, sanitizeFilename } from '../lib/pdf';
import { triggerPrintDocument } from '../lib/print';
import { PrintPreviewModal } from './PrintPreviewModal';

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  businessProfile: BusinessProfile | null;
  onViewInvoice?: (tx: Transaction) => void;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  businessProfile,
  onViewInvoice,
}) => {
  const statementRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen || !customer) return null;

  const currency = businessProfile?.currencySymbol || '$';

  // Customer transactions history
  const customerTx = transactions.filter(
    (t) => t.customerName.toLowerCase() === customer.name.toLowerCase()
  );

  const cleanCustomerName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = sanitizeFilename(`Customer-Statement-${cleanCustomerName}.pdf`);

  const handlePrint = () => {
    setToast(null);
    const success = triggerPrintDocument({
      title: `Statement - ${customer.name}`,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
    if (success) {
      setToast({
        type: 'success',
        message: 'Statement sent to Windows printer spooler.',
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!statementRef.current) return;
    setToast(null);
    const result = await downloadPdfFromElement(statementRef.current, filename);
    if (result.success) {
      setToast({ type: 'success', message: result.message });
    } else if (!result.cancelled) {
      setToast({ type: 'error', message: result.message });
    }
  };

  const renderStatementDocument = () => (
    <div className="p-8 bg-white text-slate-800 font-sans space-y-6 printable-document" ref={statementRef} data-printable="true">
      {/* Header Section */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
        <div className="flex items-start gap-4">
          {businessProfile?.logoUrl && (
            <img
              src={businessProfile.logoUrl}
              alt="Business Logo"
              className="w-16 h-16 object-contain rounded"
            />
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {businessProfile?.name || 'Printing Studio & Accounting'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">{businessProfile?.address}</p>
            <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3">
              <span>Tel: {businessProfile?.phone}</span>
              {businessProfile?.whatsapp && <span>WhatsApp: {businessProfile.whatsapp}</span>}
              {businessProfile?.email && <span>Email: {businessProfile.email}</span>}
            </div>
            {businessProfile?.taxRegistrationNumber && (
              <div className="text-[11px] font-semibold text-slate-700 mt-1">
                {businessProfile.taxRegistrationNumber}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-extrabold text-sm uppercase tracking-widest rounded mb-2">
            STATEMENT OF ACCOUNT
          </div>
          <div className="text-xs text-slate-600 font-medium">
            Issue Date: {formatDateTimePKT()}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Total Invoices: <strong className="text-slate-900">{customerTx.length}</strong>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Customer Details:
          </span>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-600" /> {customer.name}
          </h2>
          {customer.phone && (
            <p className="text-slate-600 mt-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
            </p>
          )}
          {customer.address && (
            <p className="text-slate-600 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {customer.address}
            </p>
          )}
        </div>

        <div className="text-right border-l border-slate-200 pl-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Account Status:
          </span>
          <div className="text-sm font-bold">
            {customer.totalPending === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Account Clear (No Balance)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-100 px-3 py-1 rounded-full">
                Balance Due: {formatCurrency(customer.totalPending, currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Account Financial Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase text-blue-800 block">Total Purchases</span>
          <strong className="text-lg font-bold text-blue-900 block mt-0.5">
            {formatCurrency(customer.totalPurchases, currency)}
          </strong>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Amount Paid</span>
          <strong className="text-lg font-bold text-emerald-900 block mt-0.5">
            {formatCurrency(customer.totalPaid, currency)}
          </strong>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Pending Receivables</span>
          <strong className="text-lg font-bold text-amber-900 block mt-0.5">
            {formatCurrency(customer.totalPending, currency)}
          </strong>
        </div>
      </div>

      {/* Transactions History Table */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-200 pb-1">
          Complete Invoice Ledger History
        </h3>

        {customerTx.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-slate-200 rounded-xl">
            No transaction entries recorded for this customer.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Items Purchased</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-right">Received</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {customerTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">{tx.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-600">{formatDate(tx.date)}</td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-800 font-medium">
                      {tx.items.map((i) => i.name).join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(tx.subtotal, currency)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(tx.grandTotal, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                      {formatCurrency(tx.totalReceived, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                      {formatCurrency(tx.pendingAmount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stamps & Signatures Footer */}
      <div className="pt-8 border-t border-slate-200 flex justify-between items-end avoid-page-break">
        <div>
          {businessProfile?.businessStampUrl ? (
            <div className="flex flex-col items-center">
              <img
                src={businessProfile.businessStampUrl}
                alt="Official Stamp"
                className="h-20 object-contain opacity-90"
              />
              <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">Official Stamp</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Statement issued by {businessProfile?.name || 'LedgerPro Accounting'}
              <br />
              Generated on {formatDateTimePKT()}
            </div>
          )}
        </div>

        <div className="text-right">
          {businessProfile?.ceoSignatureUrl ? (
            <div className="flex flex-col items-end">
              <img
                src={businessProfile.ceoSignatureUrl}
                alt="CEO Signature"
                className="h-14 object-contain mb-1"
              />
              <div className="w-40 border-b border-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-900">{businessProfile.ceoName}</span>
              <span className="text-[10px] text-slate-500 uppercase">CEO / Authorized Signatory</span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <div className="w-40 border-b border-slate-400 mb-1 mt-8" />
              <span className="text-xs font-bold text-slate-900">
                {businessProfile?.ceoName || 'Authorized Signatory'}
              </span>
              <span className="text-[10px] text-slate-500 uppercase">CEO / Authorized Signatory</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden border border-slate-200 my-auto">
          {/* Action Header bar */}
          <div className="print:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-sm font-bold text-blue-300">{customer.name}</span>
              <span className="text-xs text-slate-400">• Customer Statement</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" /> Print Preview
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Statement
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save PDF
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition ml-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toast Notification Banner */}
          {toast && (
            <div
              className={`px-6 py-2 text-xs font-bold flex items-center justify-between shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{toast.message}</span>
              </div>
              <button onClick={() => setToast(null)} className="text-white hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Printable Document View */}
          <div className="overflow-y-auto max-h-[80vh]">{renderStatementDocument()}</div>
        </div>
      </div>

      {/* Print Preview Overlay */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Customer Statement - ${customer.name}`}
        filename={filename}
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
      >
        {renderStatementDocument()}
      </PrintPreviewModal>
    </>
  );
};
