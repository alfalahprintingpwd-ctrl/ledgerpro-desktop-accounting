import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { triggerPrintDocument } from '../lib/print';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  onSavePdf: () => Promise<void>;
  onPrint: () => void;
  children: React.ReactNode;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  filename,
  onSavePdf,
  onPrint,
  children,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-preview-open');
      return () => {
        document.body.classList.remove('print-preview-open');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoom(100);

  const handleSave = async () => {
    setIsSaving(true);
    setToast(null);
    try {
      await onSavePdf();
    } catch {
      setToast({ type: 'error', message: 'Unable to generate PDF. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintClick = () => {
    try {
      if (onPrint) {
        onPrint();
      } else {
        triggerPrintDocument({ title });
      }
    } catch {
      setToast({
        type: 'error',
        message: 'Unable to connect to the selected printer. Please ensure a printer is installed and online in Windows.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex flex-col overflow-hidden">
      {/* Top Controls Header Bar */}
      <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                A4 • 210 x 297 mm
              </span>
            </h2>
            <p className="text-xs text-slate-400">Target Filename: <span className="font-mono text-blue-300">{filename}</span></p>
          </div>
        </div>

        {/* Center Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono font-bold text-slate-200 px-2 min-w-[3rem] text-center">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={handleResetZoom}
            title="Reset Zoom"
            className="px-2 py-1 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white font-medium transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintClick}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>PRINT DOCUMENT</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Generating PDF...' : 'SAVE AS PDF'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition ml-2 cursor-pointer"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 transition-all ${
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
          <button onClick={() => setToast(null)} className="text-white hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Preview Workspace Stage */}
      <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-slate-950">
        <div
          className="print-preview-content transition-transform duration-150 origin-top bg-white text-slate-900 shadow-2xl rounded-sm p-10 border border-slate-300"
          style={{
            width: '210mm',
            minHeight: '297mm',
            transform: `scale(${zoom / 100})`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}
          data-printable="true"
        >
          {children}
        </div>
      </div>
    </div>
  );
};
