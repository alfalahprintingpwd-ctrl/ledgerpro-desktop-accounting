import React from 'react';
import { HelpCircle, BookOpen, ShieldCheck, CheckCircle2, DollarSign, Keyboard } from 'lucide-react';

interface HelpAboutProps {
  onOpenShortcutsHelp?: () => void;
}

export const HelpAbout: React.FC<HelpAboutProps> = ({ onOpenShortcutsHelp }) => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-800 text-xs">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-blue-600" /> Help & Accounting Guide
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete guide to financial calculations, monthly files, keyboard shortcuts, and accounting principles.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        {/* Section: Keyboard Shortcuts Quick Reference */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-blue-600" /> Keyboard Shortcuts System
            </h2>
            {onOpenShortcutsHelp && (
              <button
                onClick={onOpenShortcutsHelp}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-1.5 text-xs shadow-2xs cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5" />
                Customize & View All (F1)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { key: 'F1', desc: 'Open Shortcuts Guide' },
              { key: 'Ctrl + N', desc: 'New Sales Entry' },
              { key: 'Ctrl + S', desc: 'Save Active Form' },
              { key: 'Ctrl + F', desc: 'Focus Search Bar' },
              { key: 'Ctrl + P', desc: 'Print Document' },
              { key: 'Ctrl + Shift + S', desc: 'Save as PDF' },
              { key: 'Ctrl + L', desc: 'Lock Software' },
              { key: 'Esc', desc: 'Close / Clear' },
              { key: 'Alt + D', desc: 'Go to Dashboard' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <span className="text-slate-600 text-[11px] font-medium">{item.desc}</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-[11px] text-slate-900 shadow-2xs">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Section 1: Accounting Principles */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" /> Reliable Accounting Logic
          </h2>

          <div className="space-y-2 leading-relaxed text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1 font-bold">Sales vs Received vs Pending:</strong>
              <p>
                <strong>Grand Total Bill</strong> = Subtotal - Discount + Tax.
                <br />
                <strong>Pending Receivables</strong> = Grand Total Bill - Total Money Received.
                <br />
                <em>Note:</em> Pending receivables are tracked separately and are never mistakenly counted as physical money in hand.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1 font-bold">Cash vs Bank Management:</strong>
              <p>
                • Customer payments made in Cash strictly increase <strong>Cash Balance</strong>.
                <br />
                • Customer payments made via Bank strictly increase <strong>Bank Balance</strong>.
                <br />
                • Expenses paid in Cash automatically deduct from <strong>Cash Balance</strong>.
                <br />
                • Expenses paid via Bank automatically deduct from <strong>Bank Balance</strong>.
                <br />
                • <strong>Total Available Money</strong> = Cash Balance + Bank Balance.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1 font-bold">Monthly Folder Archiving:</strong>
              <p>
                When you click <strong>FINISH MONTH</strong>:
                <br />
                1. The month file is locked against accidental edits.
                <br />
                2. A full monthly audit report is archived.
                <br />
                3. The next month file is created automatically.
                <br />
                4. Closing Cash & Bank balances are carried forward as opening balances.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Software Specifications */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Software Information & System Specs</h2>
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1 font-mono text-[11px]">
            <div>Software Name: LedgerPro Desktop Accounting</div>
            <div>Version: 1.0.0 Production Release</div>
            <div>Database: Local IndexedDB / Persistent Storage</div>
            <div>Security: Client-side Encrypted Local Hashing & Password Protection</div>
            <div>Export Formats: Printable A4 PDF, Excel/CSV Data Files</div>
          </div>
        </div>
      </div>
    </div>
  );
};
