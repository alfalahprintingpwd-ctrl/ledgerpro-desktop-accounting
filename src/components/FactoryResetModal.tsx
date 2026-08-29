import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Lock, KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';
import { verifyPassword } from '../lib/crypto';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  passwordHash: string | null;
  onConfirmReset: (providedPassword: string) => boolean | void;
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({
  isOpen,
  onClose,
  passwordHash,
  onConfirmReset,
}) => {
  // Step is ALWAYS 'password' initially if passwordHash exists
  const [step, setStep] = useState<'password' | 'warning'>('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('password');
      setCurrentPassword('');
      setErrorMessage('');
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('password');
    setCurrentPassword('');
    setErrorMessage('');
    setIsVerifying(false);
    onClose();
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentPassword) {
      setErrorMessage('Please enter your current software password.');
      return;
    }

    // Strict password verification
    const isValid = verifyPassword(currentPassword, passwordHash);

    if (isValid) {
      // Step 2: Only accessible with valid password
      setStep('warning');
      setErrorMessage('');
    } else {
      setErrorMessage('Incorrect password. Please try again.');
    }
  };

  const handleExecuteReset = (e: React.FormEvent) => {
    e.preventDefault();

    // Final security check
    const isValid = verifyPassword(currentPassword, passwordHash);
    if (!isValid) {
      setErrorMessage('Security verification failed. Incorrect password.');
      setStep('password');
      return;
    }

    const success = onConfirmReset(currentPassword);
    if (success !== false) {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-red-200 dark:border-red-900/60 shadow-2xl overflow-hidden p-6 space-y-5 relative text-slate-800 dark:text-slate-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: AUTHENTICATION (ENTER CURRENT PASSWORD) */}
        {step === 'password' && (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-200 dark:border-red-900/50">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Software Reset Authorization
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Enter your current software password to authorize software reset.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-red-600" /> Enter Current Password
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
                placeholder="Enter current software password..."
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <span>VERIFY PASSWORD</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: RESET CONFIRMATION (REACHED ONLY AFTER VALID PASSWORD) */}
        {step === 'warning' && (
          <form onSubmit={handleExecuteReset} className="space-y-4">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-inner border-2 border-red-300 dark:border-red-800 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-lg font-black text-red-600 dark:text-red-400 uppercase tracking-wide">
                WARNING
              </h2>
              <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60 text-left space-y-2">
                <p className="text-xs text-red-800 dark:text-red-200 font-bold leading-relaxed">
                  Software reset will remove/reset accounting data and return the software to its initial setup state. This action cannot be undone.
                </p>
                <ul className="text-[11px] text-red-700 dark:text-red-300 list-disc list-inside space-y-0.5">
                  <li>All invoice records and customers will be cleared</li>
                  <li>All expense vouchers and cash/bank balances will be reset</li>
                  <li>Password and security settings will return to first-time setup</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Trash2 className="w-4 h-4" />
                <span>RESET SOFTWARE</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
