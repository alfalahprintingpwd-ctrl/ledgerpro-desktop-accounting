import React, { useState } from 'react';
import { AppData, BusinessProfile } from '../types';
import { getLocalAccountingDate } from '../lib/utils';
import { Database, Download, Upload, AlertTriangle, CheckCircle2, Sparkles, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { FactoryResetModal } from './FactoryResetModal';

interface BackupRestoreProps {
  appData: AppData;
  onRestoreData: (newAppData: AppData) => void;
  onLoadSampleData: () => void;
  businessProfile: BusinessProfile | null;
  onFactoryReset?: (providedPassword: string) => boolean | void;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({
  appData,
  onRestoreData,
  onLoadSampleData,
  businessProfile,
  onFactoryReset,
}) => {
  const [restoreFileText, setRestoreFileText] = useState<string>('');
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [parsedRestoreData, setParsedRestoreData] = useState<AppData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Export JSON Backup
  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = getLocalAccountingDate();
    const link = document.createElement('a');
    link.href = url;
    link.download = `LedgerPro_Backup_${businessProfile?.name ? businessProfile.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Accounting'}_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);

          if (!parsed || typeof parsed !== 'object' || !parsed.businessProfile) {
            setErrorMsg('Invalid backup file format. Must be a valid LedgerPro JSON backup.');
            return;
          }

          setParsedRestoreData(parsed);
          setRestoreConfirmOpen(true);
        } catch (err) {
          setErrorMsg('Failed to parse JSON file. Please verify file integrity.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmRestore = () => {
    if (parsedRestoreData) {
      onRestoreData(parsedRestoreData);
      setRestoreConfirmOpen(false);
      setParsedRestoreData(null);
      setSuccessMsg('Database restored successfully!');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" /> Backup & Restore Accounting Data
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Safeguard your accounting ledger files by exporting offline backups to your hard drive or USB.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Backup Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">1. Export Full Local Backup</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Downloads a complete snapshot of all business settings, monthly files, sales invoices, customer directory, and expenses as a secure JSON backup file.
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div>Total Transactions: <strong>{appData.transactions.length}</strong></div>
              <div>Total Expenses: <strong>{appData.expenses.length}</strong></div>
              <div>Monthly Files: <strong>{appData.months.length}</strong></div>
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Backup JSON File
          </button>
        </div>

        {/* Restore Backup Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">2. Restore Database from Backup</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload a previously downloaded LedgerPro JSON backup file to replace current accounting records.
            </p>
          </div>

          <div>
            <label className="block w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl text-center cursor-pointer shadow-md transition">
              <span className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Select Backup File to Restore
              </span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Demo Sample Data Box */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400">
            <Sparkles className="w-4 h-4" /> Load Sample Printing Studio Demo Records
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Want to explore pre-filled monthly accounting files, customer invoices, and expenses? Click below to populate sample printing studio data.
          </p>
        </div>

        <button
          onClick={onLoadSampleData}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Populate Sample Printing Studio Data
        </button>
      </div>

      {/* Factory / First-Run State Reset Box */}
      {onFactoryReset && (
        <div className="bg-red-50/70 rounded-2xl p-6 shadow-sm border border-red-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2 text-red-900">
              <RotateCcw className="w-4 h-4 text-red-600" /> Factory / First-Run Software Reset
            </h3>
            <p className="text-xs text-slate-700 mt-1 max-w-xl">
              Testing reset: Permanently delete all local accounting records, customer lists, invoices, business profiles, and software login password to return to the initial First-Time Setup Wizard.
            </p>
          </div>

          <button
            onClick={() => setShowResetModal(true)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Trash2 className="w-4 h-4" /> Reset Software to Factory State
          </button>
        </div>
      )}

      {/* Restore Confirm Modal */}
      {restoreConfirmOpen && parsedRestoreData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" /> Confirm Database Restoration
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to restore database for{' '}
              <strong>{parsedRestoreData.businessProfile?.name}</strong>?
              <br /><br />
              This will overwrite your existing accounting transactions with{' '}
              <strong>{parsedRestoreData.transactions.length}</strong> invoices from the backup.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRestoreConfirmOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-5 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Yes, Restore Backup Data
              </button>
            </div>
          </div>
        </div>
      )}

      {onFactoryReset && (
        <FactoryResetModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          passwordHash={appData.passwordHash || ''}
          onConfirmReset={onFactoryReset}
        />
      )}
    </div>
  );
};
