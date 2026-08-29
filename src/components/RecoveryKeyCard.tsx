import React, { useRef, useState } from 'react';
import { ShieldAlert, Copy, Check, Printer, FileDown, Key } from 'lucide-react';
import { downloadPdfFromElement } from '../lib/pdf';
import { triggerNativeWindowsPrint } from '../lib/print';

interface RecoveryKeyCardProps {
  recoveryKey: string;
  businessName?: string;
  ceoName?: string;
  contactPhone?: string;
  showDetails?: boolean;
}

export const RecoveryKeyCard: React.FC<RecoveryKeyCardProps> = ({
  recoveryKey,
  businessName,
  ceoName,
  contactPhone,
  showDetails = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    triggerNativeWindowsPrint({
      title: `Emergency Recovery Key - ${businessName || 'LedgerPro'}`,
      landscape: false,
    });
  };

  const handleDownloadPDF = async () => {
    if (cardRef.current) {
      await downloadPdfFromElement(
        cardRef.current,
        `Emergency_Recovery_Key_${businessName ? businessName.replace(/[^a-zA-Z0-9]/g, '_') : 'LedgerPro'}.pdf`
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* Printable / Downloadable Card Container */}
      <div
        ref={cardRef}
        className="bg-slate-900 text-white rounded-2xl p-6 border-2 border-slate-800 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Emergency Recovery Key</h3>
              <p className="text-[11px] text-slate-400">Offline Master Password Recovery Token</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold uppercase tracking-wider rounded-md">
            CONFIDENTIAL
          </span>
        </div>

        {showDetails && (businessName || ceoName || contactPhone) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 mb-4 text-[11px] text-slate-300">
            {businessName && (
              <div>
                <span className="text-slate-500 block uppercase text-[9px] font-semibold">Business</span>
                <span className="font-medium text-white truncate block">{businessName}</span>
              </div>
            )}
            {ceoName && (
              <div>
                <span className="text-slate-500 block uppercase text-[9px] font-semibold">Owner / CEO</span>
                <span className="font-medium text-white truncate block">{ceoName}</span>
              </div>
            )}
            {contactPhone && (
              <div>
                <span className="text-slate-500 block uppercase text-[9px] font-semibold">Contact</span>
                <span className="font-medium text-white truncate block">{contactPhone}</span>
              </div>
            )}
          </div>
        )}

        {/* Display Recovery Key Box */}
        <div className="bg-slate-950 rounded-xl p-4 border border-amber-500/30 text-center my-2 shadow-inner">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-1">
            SECRET RECOVERY KEY
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-widest select-all break-all">
            {recoveryKey}
          </div>
        </div>

        {/* Mandatory Security Warning */}
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Keep your Recovery Key in a safe place.</strong> Anyone who has this key may be able to reset the software password.
          </p>
        </div>
      </div>

      {/* Control Actions: Copy, Print, Save PDF */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Key'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
        >
          <Printer className="w-3.5 h-3.5 text-slate-700" />
          <span>Print Key</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPDF}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Save as PDF</span>
        </button>
      </div>
    </div>
  );
};
