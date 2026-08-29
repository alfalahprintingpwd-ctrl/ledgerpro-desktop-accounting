import React, { useRef, useState } from 'react';
import { BusinessProfile } from '../types';
import { formatDate, formatDateTimePKT } from '../lib/utils';
import { triggerNativeWindowsPrint, getPrintSettings } from '../lib/print';
import { downloadPdfFromElement, sanitizeFilename } from '../lib/pdf';
import {
  Printer,
  X,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Monitor,
  Settings2,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { PrintPreviewModal } from './PrintPreviewModal';

interface PrintTestPageProps {
  isOpen: boolean;
  onClose: () => void;
  businessProfile: BusinessProfile | null;
}

export const PrintTestPageModal: React.FC<PrintTestPageProps> = ({
  isOpen,
  onClose,
  businessProfile,
}) => {
  const testRef = useRef<HTMLDivElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const settings = getPrintSettings();
  const currentDateStr = formatDateTimePKT();

  const handlePrint = () => {
    setToast(null);
    triggerNativeWindowsPrint({
      title: 'Windows Printer Test Page',
      landscape: false,
      onError: (msg) => setToast({ type: 'error', message: msg }),
    });
  };

  const handleDownloadPDF = async () => {
    if (!testRef.current) return;
    setToast(null);
    const filename = sanitizeFilename('Windows-Print-Test-Page.pdf');
    const result = await downloadPdfFromElement(testRef.current, filename);
    if (result.success) {
      setToast({ type: 'success', message: result.message });
    } else if (!result.cancelled) {
      setToast({ type: 'error', message: result.message });
    }
  };

  const renderTestDocument = () => (
    <div
      ref={testRef}
      data-printable="true"
      className="p-8 bg-white text-slate-900 font-sans space-y-6 printable-document border border-slate-200 shadow-sm rounded-sm"
    >
      {/* Test Document Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
        <div className="flex items-start gap-4">
          {businessProfile?.logoUrl ? (
            <img
              src={businessProfile.logoUrl}
              alt="Logo"
              className="w-16 h-16 object-contain rounded border border-slate-200 p-1"
            />
          ) : (
            <div className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-sm shrink-0">
              LP
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {businessProfile?.name || 'LedgerPro Accounting Software'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {businessProfile?.address || '123 Enterprise Blvd, Commercial Center'}
            </p>
            <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3">
              <span>Tel: {businessProfile?.phone || '+1 (555) 019-2831'}</span>
              <span>Email: {businessProfile?.email || 'admin@ledgerpro.local'}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-blue-700 text-white px-4 py-1.5 font-extrabold text-xs uppercase tracking-widest rounded shadow-sm mb-2">
            PRINT TEST PAGE
          </div>
          <div className="font-mono text-xs font-bold text-slate-700">
            TEST-REF: #{Math.floor(100000 + Math.random() * 900000)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">{currentDateStr}</div>
        </div>
      </div>

      {/* System & Printer Status Matrix */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
          <Monitor className="w-4 h-4 text-blue-600" /> Windows Printing Diagnostics & Config
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Default Printer
            </span>
            <span className="font-bold text-slate-800">{settings.defaultPrinter}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Paper Size</span>
            <span className="font-bold text-slate-800">{settings.paperSize} (210 x 297 mm)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Orientation
            </span>
            <span className="font-bold text-slate-800 uppercase">{settings.orientation}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Margins</span>
            <span className="font-bold text-slate-800 uppercase">{settings.margins}</span>
          </div>
        </div>
      </div>

      {/* Ink & Color Reproduction Test */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Palette className="w-4 h-4 text-blue-600" /> Color Reproduction Swatch Matrix
        </h2>
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold text-white py-1">
          <div className="bg-blue-600 p-3 rounded-lg shadow-xs">
            Blue
            <div className="text-[9px] font-mono opacity-80">#2563EB</div>
          </div>
          <div className="bg-emerald-600 p-3 rounded-lg shadow-xs">
            Emerald
            <div className="text-[9px] font-mono opacity-80">#059669</div>
          </div>
          <div className="bg-amber-600 p-3 rounded-lg shadow-xs">
            Amber
            <div className="text-[9px] font-mono opacity-80">#D97706</div>
          </div>
          <div className="bg-rose-600 p-3 rounded-lg shadow-xs">
            Rose
            <div className="text-[9px] font-mono opacity-80">#E11D48</div>
          </div>
          <div className="bg-slate-900 p-3 rounded-lg shadow-xs">
            Charcoal
            <div className="text-[9px] font-mono opacity-80">#0F172A</div>
          </div>
        </div>
      </div>

      {/* Sample Typography & Table Alignment Test */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-blue-600" /> Font Hierarchy & Table Grid Alignment
        </h2>
        <table className="w-full text-xs text-left border border-slate-300 rounded overflow-hidden">
          <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Item Description</th>
              <th className="p-2.5 text-center">Qty</th>
              <th className="p-2.5 text-right">Unit Price</th>
              <th className="p-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            <tr>
              <td className="p-2.5">A4 Offset Printing Paper (80 GSM)</td>
              <td className="p-2.5 text-center">50</td>
              <td className="p-2.5 text-right font-mono">$12.50</td>
              <td className="p-2.5 text-right font-mono">$625.00</td>
            </tr>
            <tr>
              <td className="p-2.5">High-Speed Laserjet Printer Calibration</td>
              <td className="p-2.5 text-center">1</td>
              <td className="p-2.5 text-right font-mono">$150.00</td>
              <td className="p-2.5 text-right font-mono">$150.00</td>
            </tr>
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-2.5 text-right uppercase text-[10px]">
                Test Subtotal:
              </td>
              <td className="p-2.5 text-right font-mono text-blue-700">$775.00</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signatures & Verification Block */}
      <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" /> Windows Print Spooler Verified
          </div>
          <p className="text-[10px] text-slate-500">
            If all borders, text lines, colors, and tables appear sharp and clear, your printer is
            fully configured and ready for production invoices and reports.
          </p>
        </div>

        <div className="flex justify-end gap-6 text-center">
          {businessProfile?.ceoSignatureUrl && (
            <div className="flex flex-col items-center">
              <img
                src={businessProfile.ceoSignatureUrl}
                alt="Signature"
                className="h-10 object-contain mb-1"
              />
              <span className="text-[10px] font-bold text-slate-700 border-t border-slate-400 pt-0.5 min-w-[120px]">
                {businessProfile.ceoName || 'Authorized Signature'}
              </span>
            </div>
          )}

          {businessProfile?.businessStampUrl && (
            <div className="flex flex-col items-center">
              <img
                src={businessProfile.businessStampUrl}
                alt="Stamp"
                className="h-10 object-contain mb-1"
              />
              <span className="text-[10px] font-bold text-slate-700">Official Stamp</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t border-slate-200 pt-3 text-[10px] text-slate-400 font-mono flex justify-between">
        <span>LedgerPro Desktop Accounting System • Offline Print Bridge</span>
        <span>A4 Paper Standard (210 x 297 mm)</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header Bar */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Print Test Page — Windows Hardware Test</h2>
              <p className="text-xs text-slate-400">
                Verify local printer connectivity, colors, margins, and paper scaling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Preview</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT TEST PAGE</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div className="w-full max-w-[210mm] shadow-md bg-white rounded-md text-slate-900">
            {renderTestDocument()}
          </div>
        </div>
      </div>

      {/* Full-screen Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Print Test Page Preview"
        filename="Windows-Print-Test-Page.pdf"
        onSavePdf={handleDownloadPDF}
        onPrint={handlePrint}
        documentType="Printer Hardware Test Page"
        orientation="portrait"
        pageCount={1}
      >
        {renderTestDocument()}
      </PrintPreviewModal>
    </div>
  );
};
