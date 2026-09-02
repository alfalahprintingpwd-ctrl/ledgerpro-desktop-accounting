import React, { useRef, useState, useEffect } from 'react';
import { Transaction, BusinessProfile } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import {
  X,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Ban,
  Loader2,
} from 'lucide-react';
import { downloadPdfFromElement, sanitizeFilename } from '../lib/pdf';
import { triggerNativeWindowsPrint } from '../lib/print';
import { PrintPreviewModal } from './PrintPreviewModal';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  businessProfile: BusinessProfile | null;
  onEdit?: (tx: Transaction) => void;
  onDeleteOrVoid?: (tx: Transaction) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  transaction,
  businessProfile,
  onEdit,
  onDeleteOrVoid,
  onNavigatePrev,
  onNavigateNext,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Keyboard Shortcuts listener when Invoice Modal is active
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside a input/textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (isPreviewOpen) {
          setIsPreviewOpen(false);
        } else {
          onClose();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsPreviewOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleDownloadPDF();
      } else if (e.key === 'ArrowLeft' && onNavigatePrev) {
        e.preventDefault();
        onNavigatePrev();
      } else if (e.key === 'ArrowRight' && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPreviewOpen, onNavigatePrev, onNavigateNext, transaction]);

  if (!isOpen || !transaction) return null;

  const currency = businessProfile?.currencySymbol || '$';
  const rawInvoiceNumber = transaction.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
  const filename = sanitizeFilename(`${rawInvoiceNumber}.pdf`);

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setToast(null);

    const win = typeof window !== 'undefined' ? (window as any) : null;

    // Electron IPC Bridge: explicitly call window.ipcRenderer.send('print-invoice', { invoiceId: transaction.id })
    if (win?.ipcRenderer?.send && typeof win.ipcRenderer.send === 'function') {
      try {
        if (win.ipcRenderer.once && typeof win.ipcRenderer.once === 'function') {
          win.ipcRenderer.once('print-invoice-reply', (_event: any, reply: any) => {
            setIsPrinting(false);
            if (reply?.success) {
              setToast({ type: 'success', message: 'Invoice sent to printer.' });
            } else if (reply?.cancelled) {
              // User cancelled in native dialog - handle silently without triggering error states
              setToast(null);
            } else if (reply?.failureReason && !reply.failureReason.toLowerCase().includes('cancel')) {
              setToast({ type: 'error', message: reply.failureReason });
            }
          });
        } else {
          setTimeout(() => setIsPrinting(false), 2000);
        }

        win.ipcRenderer.send('print-invoice', { invoiceId: transaction.id });
        return;
      } catch (ipcErr: any) {
        console.error('IPC print-invoice send error:', ipcErr);
        setIsPrinting(false);
      }
    }

    // Web / Browser / Fallback native print dialog (window.print())
    try {
      const result = await triggerNativeWindowsPrint({
        title: `Invoice - ${transaction.invoiceNumber}`,
        landscape: false,
        onError: (msg) => {
          if (!msg.toLowerCase().includes('cancel')) {
            setToast({ type: 'error', message: msg });
          }
        },
      });

      // User closed or cancelled native dialog: do NOT show premature auto-dispatch message
      if (result?.error && !result.error.toLowerCase().includes('cancel')) {
        setToast({ type: 'error', message: result.error });
      }
    } catch (err: any) {
      const msg = err?.message || 'Unable to open print dialog.';
      if (!msg.toLowerCase().includes('cancel')) {
        setToast({ type: 'error', message: msg });
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setToast(null);
    const result = await downloadPdfFromElement(invoiceRef.current, filename);
    if (result.success) {
      setToast({ type: 'success', message: result.message });
    } else if (!result.cancelled) {
      setToast({ type: 'error', message: result.message });
    }
  };

  const activeProfile = transaction.businessSnapshot || businessProfile;

  const renderInvoiceDocument = () => (
    <div className="p-8 bg-white text-slate-800 font-sans space-y-6 printable-document relative" ref={invoiceRef} data-printable="true">
      {/* VOIDED Banner if transaction is voided */}
      {(transaction.isVoided || transaction.status === 'voided') && (
        <div className="bg-red-600 text-white font-black text-center py-2.5 px-4 rounded-xl shadow-md uppercase tracking-widest text-sm flex items-center justify-center gap-2">
          <Ban className="w-5 h-5" /> VOIDED / CANCELLED INVOICE — REVERSED FROM FINANCIAL RECORDS
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
        <div className="flex items-start gap-4">
          {activeProfile?.logoUrl && (
            <img
              src={activeProfile.logoUrl}
              alt="Business Logo"
              className="w-16 h-16 object-contain rounded"
            />
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {activeProfile?.name || 'Printing Studio & Business'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">{activeProfile?.address}</p>
            <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3">
              <span>Tel: {activeProfile?.phone}</span>
              {activeProfile?.whatsapp && <span>WhatsApp: {activeProfile.whatsapp}</span>}
              {activeProfile?.email && <span>Email: {activeProfile.email}</span>}
            </div>
            {activeProfile?.taxRegistrationNumber && (
              <div className="text-[11px] font-semibold text-slate-700 mt-1">
                {activeProfile.taxRegistrationNumber}
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-extrabold text-sm uppercase tracking-widest rounded mb-2">
            INVOICE
          </div>
          <div className="font-mono font-bold text-lg text-slate-900">
            {transaction.invoiceNumber}
          </div>
          <div className="text-xs text-slate-600 font-medium mt-1">
            Date: {formatDate(transaction.date)} ({transaction.day})
          </div>
        </div>
      </div>

      {/* Customer Bill To Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Billed To Customer:
          </span>
          <h2 className="text-sm font-bold text-slate-900">{transaction.customerName}</h2>
          {transaction.customerPhone && (
            <p className="text-xs text-slate-600 mt-0.5">Phone: {transaction.customerPhone}</p>
          )}
          {transaction.customerAddress && (
            <p className="text-xs text-slate-600 mt-0.5">Address: {transaction.customerAddress}</p>
          )}
        </div>

        <div className="text-right border-l border-slate-200 pl-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Payment Status:
          </span>
          <div className="text-xs font-semibold">
            {transaction.pendingAmount === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                Partially Paid ({formatCurrency(transaction.pendingAmount, currency)} Pending)
              </span>
            )}
          </div>
          <div className="text-xs text-slate-600 mt-2">
            Method: <strong className="text-slate-800">{transaction.paymentMethod}</strong>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
            <th className="py-2.5 px-3">#</th>
            <th className="py-2.5 px-3">Product / Service Description</th>
            <th className="py-2.5 px-3 text-center">Qty</th>
            <th className="py-2.5 px-3 text-right">Unit Price</th>
            <th className="py-2.5 px-3 text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 border-b border-slate-200 bg-white">
          {transaction.items.map((item, index) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="py-3 px-3 text-slate-500 font-mono">{index + 1}</td>
              <td className="py-3 px-3">
                <div className="font-bold text-slate-900">{item.name}</div>
                {item.description && (
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                )}
              </td>
              <td className="py-3 px-3 text-center font-medium">{item.quantity}</td>
              <td className="py-3 px-3 text-right font-mono text-slate-700">
                {formatCurrency(item.unitPrice, currency)}
              </td>
              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                {formatCurrency(item.total, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary & Signatures Grid */}
      <div className="grid grid-cols-2 gap-8 items-start">
        {/* Notes & Terms */}
        <div className="text-xs space-y-2">
          {transaction.notes && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
              <span className="font-bold text-slate-700 block text-[10px] uppercase mb-0.5">
                Order Remarks / Notes:
              </span>
              <p className="text-slate-600">{transaction.notes}</p>
            </div>
          )}
          <p className="text-slate-500 italic text-[11px]">
            {businessProfile?.invoiceFooterNote ||
              'Thank you for your business! All goods received in good condition.'}
          </p>
        </div>

        {/* Total Calculations */}
        <div className="space-y-1.5 text-xs text-right bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono font-bold">{formatCurrency(transaction.subtotal, currency)}</span>
          </div>

          {transaction.discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Discount:</span>
              <span className="font-mono">- {formatCurrency(transaction.discount, currency)}</span>
            </div>
          )}

          {transaction.tax > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Tax Amount:</span>
              <span className="font-mono">+ {formatCurrency(transaction.tax, currency)}</span>
            </div>
          )}

          <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm font-black text-slate-900">
            <span>Grand Total:</span>
            <span className="font-mono text-blue-700">{formatCurrency(transaction.grandTotal, currency)}</span>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-700 font-semibold">
            <span>Total Received:</span>
            <span className="font-mono text-emerald-700">
              {formatCurrency(transaction.totalReceived, currency)}
            </span>
          </div>

          {transaction.pendingAmount > 0 && (
            <div className="flex justify-between text-amber-700 font-bold bg-amber-50 p-1.5 rounded border border-amber-200">
              <span>Balance Due (Pending):</span>
              <span className="font-mono">{formatCurrency(transaction.pendingAmount, currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stamps & Signatures Footer */}
      <div className="pt-6 border-t border-slate-200 flex justify-between items-end avoid-page-break">
        <div>
          {activeProfile?.businessStampUrl && (
            <div className="flex flex-col items-center">
              <img
                src={activeProfile.businessStampUrl}
                alt="Official Stamp"
                className="h-20 object-contain opacity-90"
              />
              <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">Official Stamp</span>
            </div>
          )}
        </div>

        <div className="text-right">
          {activeProfile?.ceoSignatureUrl ? (
            <div className="flex flex-col items-end">
              <img
                src={activeProfile.ceoSignatureUrl}
                alt="CEO Signature"
                className="h-14 object-contain mb-1"
              />
              <div className="w-40 border-b border-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-900">{activeProfile.ceoName}</span>
              <span className="text-[10px] text-slate-500 uppercase">CEO / Authorized Signatory</span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <div className="w-40 border-b border-slate-400 mb-1 mt-8" />
              <span className="text-xs font-bold text-slate-900">
                {activeProfile?.ceoName || 'Authorized Signatory'}
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
      <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 my-auto">
          {/* Action Header bar */}
          <div className="print:hidden bg-slate-900 dark:bg-slate-950 text-white px-6 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-400">
                {transaction.invoiceNumber}
              </span>
              <span className="text-xs text-slate-400">Official Invoice Preview</span>
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(transaction);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  title="Edit Invoice Entry"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-400" /> Edit
                </button>
              )}
              {onDeleteOrVoid && (
                <button
                  onClick={() => {
                    onClose();
                    onDeleteOrVoid(transaction);
                  }}
                  className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-red-800/50"
                  title="Delete or Void Invoice"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete / Void
                </button>
              )}
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" /> Print Preview
              </button>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Opening Windows Print...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    <span>Print Invoice</span>
                  </>
                )}
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

          {/* Printable Invoice Container */}
          <div className="overflow-y-auto max-h-[80vh]">{renderInvoiceDocument()}</div>
        </div>
      </div>

      {/* Print Preview Overlay */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Invoice - ${transaction.invoiceNumber}`}
        filename={filename}
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
        documentType="Sales Invoice"
        orientation="portrait"
        pageCount={1}
      >
        {renderInvoiceDocument()}
      </PrintPreviewModal>
    </>
  );
};
