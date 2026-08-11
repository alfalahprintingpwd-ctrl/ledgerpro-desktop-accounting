import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Lock, KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';
import { simpleHash } from '../lib/utils';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  passwordHash: string;
  requirePassword?: boolean;
  onConfirmReset: (providedPassword?: string) => boolean | void;
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({
  isOpen,
  onClose,
  passwordHash,
  requirePassword = false,
  onConfirmReset,
}) => {
  const [step, setStep] = useState<'password' | 'warning'>(
    requirePassword && passwordHash ? 'password' : 'warning'
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [typedConfirmation, setTypedConfirmation] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset all internal modal state safely
    setStep(requirePassword && passwordHash ? 'password' : 'warning');
    setCurrentPassword('');
    setErrorMessage('');
    setTypedConfirmation('');
    onClose();
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Verify current password against stored password hash
    if (!passwordHash || simpleHash(currentPassword) === passwordHash) {
      // Correct password -> Proceed to step 2 (warning & confirmation)
      setStep('warning');
      setErrorMessage('');
    } else {
      // Incorrect password -> Show exact error message and stay on step 1
      setErrorMessage('Incorrect password. Software reset cannot continue.');
    }
  };

  const handleFinalConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedConfirmation.trim() !== 'RESET') {
      return;
    }

    // Perform reset with verified password
    const result = onConfirmReset(currentPassword);
    if (result !== false) {
      handleClose();
    } else {
      setErrorMessage('Security verification failed during reset execution.');
      setStep('password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full border border-red-200 shadow-2xl overflow-hidden p-6 space-y-5 relative">
        {/* Close Icon */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: VERIFY CURRENT PASSWORD FIRST */}
        {step === 'password' && (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-200">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
                Verify Current Password
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                To initiate software reset, please authorize with your current software password first.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-red-600" /> Current Password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Enter current password..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium text-slate-900"
              />
              <div className="mt-1 text-right">
                <button
                  type="button"
                  onClick={() => setStep('warning')}
                  className="text-[11px] text-red-600 hover:text-red-800 font-semibold hover:underline cursor-pointer"
                >
                  Forgot password? Skip password and reset software
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <span>VERIFY & CONTINUE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: RESET WARNING & TYPE 'RESET' CONFIRMATION */}
        {step === 'warning' && (
          <form onSubmit={handleFinalConfirmReset} className="space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                RESET SOFTWARE TO FACTORY STATE
              </h2>
              <p className="text-xs text-red-600 font-bold uppercase tracking-wider">
                Permanent Data & Software Reset
              </p>
            </div>

            {/* Mandatory Prompt Warning Message */}
            <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-xs text-slate-800 leading-relaxed font-semibold">
              You are about to reset the software. This will permanently remove the current business information, password, recovery settings and accounting data. This action cannot be undone.
            </div>

            <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-700">All data will be completely cleared:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li>Business profile, logo, CEO signature & stamp</li>
                <li>Master software password & recovery settings</li>
                <li>Customer directory, invoices, & sales entries</li>
                <li>Expenses, cash/bank balances, & monthly files</li>
              </ul>
            </div>

            {/* TYPE RESET CONFIRMATION FIELD */}
            <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                To confirm reset, please type <span className="text-red-700 font-mono font-extrabold bg-red-100 px-1 py-0.5 rounded">RESET</span> in uppercase below (or click Direct Reset):
              </label>
              <input
                type="text"
                autoFocus
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Type RESET to confirm..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 font-mono font-bold text-xs uppercase text-center tracking-widest text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onConfirmReset();
                  handleClose();
                }}
                className="px-3.5 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl transition cursor-pointer border border-red-300 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>DIRECT RESET (CLEAR ALL)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={typedConfirmation.trim() !== 'RESET'}
                  className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 uppercase tracking-wider ${
                    typedConfirmation.trim() === 'RESET'
                      ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> CONFIRM RESET
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
