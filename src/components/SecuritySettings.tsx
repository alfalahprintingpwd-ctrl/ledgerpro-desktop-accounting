import React, { useState } from 'react';
import { PasswordRecoveryConfig, SecurityAuditLog, BusinessProfile } from '../types';
import { formatDateTimePKT, simpleHash } from '../lib/utils';
import { verifyPassword, hashPassword } from '../lib/crypto';
import {
  validateNewPassword,
  generateRecoveryKey,
  hashAnswer,
  hashRecoveryKey,
  createSecurityLog,
} from '../lib/security';
import { RecoveryKeyCard } from './RecoveryKeyCard';
import { FactoryResetModal } from './FactoryResetModal';
import {
  Shield,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  History,
  RefreshCw,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface SecuritySettingsProps {
  passwordHash: string;
  recoveryConfig?: PasswordRecoveryConfig | null;
  securityLogs?: SecurityAuditLog[];
  businessProfile?: BusinessProfile | null;
  onChangePassword: (
    newHash: string,
    updatedConfig?: PasswordRecoveryConfig,
    auditLog?: SecurityAuditLog
  ) => void;
  onLock: () => void;
  onFactoryReset?: (providedPassword: string) => boolean | void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  passwordHash,
  recoveryConfig,
  securityLogs = [],
  businessProfile,
  onChangePassword,
  onLock,
  onFactoryReset,
}) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'password' | 'recovery' | 'logs'>('password');
  const [showResetModal, setShowResetModal] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Recovery Edit State
  const [recBusinessName, setRecBusinessName] = useState(
    recoveryConfig?.businessName || businessProfile?.name || ''
  );
  const [recCeoName, setRecCeoName] = useState(
    recoveryConfig?.ceoName || businessProfile?.ceoName || ''
  );
  const [recContactPhone, setRecContactPhone] = useState(
    recoveryConfig?.contactPhone || businessProfile?.phone || ''
  );

  const [question1, setQuestion1] = useState(
    recoveryConfig?.securityQuestion1 || 'What was the name of your first school or college?'
  );
  const [answer1, setAnswer1] = useState('');

  const [question2, setQuestion2] = useState(
    recoveryConfig?.securityQuestion2 || 'What is your primary registration city or bank location?'
  );
  const [answer2, setAnswer2] = useState('');

  const [recoveryPin, setRecoveryPin] = useState('');
  const [currentPassForRecovery, setCurrentPassForRecovery] = useState('');
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);

  // Success / Error Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Change Main Password
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (passwordHash && !verifyPassword(currentPassword, passwordHash)) {
      setErrorMsg('Incorrect current password.');
      return;
    }

    const passCheck = validateNewPassword(newPassword);
    if (!passCheck.valid) {
      setErrorMsg(passCheck.message || 'Invalid password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    const newHash = hashPassword(newPassword);
    const log = createSecurityLog(
      'password_changed',
      'Software master password successfully updated via Security Settings.'
    );

    onChangePassword(newHash, recoveryConfig || undefined, log);

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg('Password updated successfully!');
  };

  // Handle Update Recovery Profile
  const handleUpdateRecoveryProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (passwordHash && !verifyPassword(currentPassForRecovery, passwordHash)) {
      setErrorMsg('Incorrect current password. Re-enter password to authorize security changes.');
      return;
    }

    if (!recBusinessName.trim() || !recCeoName.trim() || !recContactPhone.trim()) {
      setErrorMsg('Business Name, CEO Name, and Contact Number are required.');
      return;
    }

    let finalAnswerHash1 = recoveryConfig?.securityAnswerHash1 || '';
    if (answer1.trim()) {
      finalAnswerHash1 = hashAnswer(answer1);
    }

    let finalAnswerHash2 = recoveryConfig?.securityAnswerHash2 || '';
    if (answer2.trim()) {
      finalAnswerHash2 = hashAnswer(answer2);
    }

    let finalPinHash = recoveryConfig?.recoveryPinHash || '';
    if (recoveryPin.trim()) {
      if (recoveryPin.trim().length < 4) {
        setErrorMsg('Recovery PIN must be at least 4 digits long.');
        return;
      }
      finalPinHash = simpleHash(recoveryPin.trim());
    }

    let finalKeyHash = recoveryConfig?.recoveryKeyHash || '';
    if (newRecoveryKey) {
      finalKeyHash = hashRecoveryKey(newRecoveryKey);
    }

    const updatedConfig: PasswordRecoveryConfig = {
      businessName: recBusinessName.trim(),
      ceoName: recCeoName.trim(),
      contactPhone: recContactPhone.trim(),
      securityQuestion1: question1.trim(),
      securityAnswerHash1: finalAnswerHash1,
      securityQuestion2: question2.trim(),
      securityAnswerHash2: finalAnswerHash2,
      recoveryPinHash: finalPinHash,
      recoveryKeyHash: finalKeyHash,
      updatedAt: new Date().toISOString(),
    };

    const log = createSecurityLog(
      'recovery_setup_updated',
      'Password recovery security questions and PIN profile updated in Security Settings.'
    );

    onChangePassword(passwordHash, updatedConfig, log);

    setCurrentPassForRecovery('');
    setAnswer1('');
    setAnswer2('');
    setRecoveryPin('');
    setSuccessMsg('Password recovery configuration updated successfully!');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" /> Security & Password Management
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage application access security, offline password recovery questions, and security audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`pb-2 transition cursor-pointer ${
            activeTab === 'password'
              ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Change Software Password
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('recovery');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`pb-2 transition cursor-pointer ${
            activeTab === 'recovery'
              ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Password Recovery Configuration
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('logs');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`pb-2 transition cursor-pointer ${
            activeTab === 'logs'
              ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Security Audit Logs ({securityLogs.length})
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: CHANGE PASSWORD */}
      {activeTab === 'password' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form
            onSubmit={handleChangePassword}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4 text-xs text-slate-800 dark:text-slate-200"
          >
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Change Software Password
            </h2>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                placeholder="Minimum 8 characters..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>

          {/* Immediate Lock & Reset Cards */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
              <div className="space-y-2">
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" /> Immediate Software Lock
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Lock the application screen immediately. Re-entering your password will be required to unlock and resume editing.
                </p>
              </div>

              <button
                type="button"
                onClick={onLock}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer border border-transparent dark:border-slate-700"
              >
                <Lock className="w-4 h-4 text-amber-400" /> Lock Software Now
              </button>
            </div>

            {onFactoryReset && (
              <div className="bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50 p-6 shadow-2xs space-y-4">
                <div className="space-y-2">
                  <h2 className="font-bold text-sm text-red-900 dark:text-red-300 border-b border-red-200/60 dark:border-red-900/60 pb-2 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-red-600 dark:text-red-400" /> Software Reset
                  </h2>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Software reset will remove/reset accounting data and return the software to its initial setup state. Requires authorization with your current software password.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Trash2 className="w-4 h-4" /> Software Reset
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECOVERY CONFIGURATION */}
      {activeTab === 'recovery' && (
        <form
          onSubmit={handleUpdateRecoveryProfile}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5 text-xs text-slate-800 dark:text-slate-200"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Offline Password Recovery Profile
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Update security questions, answers, and recovery PIN. (Note: Security answers and PIN are stored as secure hashes and never displayed in plain text).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={recBusinessName}
                onChange={(e) => setRecBusinessName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Owner / CEO Name *</label>
              <input
                type="text"
                required
                value={recCeoName}
                onChange={(e) => setRecCeoName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Phone *</label>
              <input
                type="text"
                required
                value={recContactPhone}
                onChange={(e) => setRecContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Security Questions & Answers */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Security Questions</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Question 1</label>
                <input
                  type="text"
                  required
                  value={question1}
                  onChange={(e) => setQuestion1(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">New Answer 1 (Leave blank to keep existing)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Question 2</label>
                <input
                  type="text"
                  required
                  value={question2}
                  onChange={(e) => setQuestion2(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">New Answer 2 (Leave blank to keep existing)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">New Recovery PIN (Leave blank to keep existing)</label>
              <input
                type="password"
                placeholder="••••"
                value={recoveryPin}
                onChange={(e) => setRecoveryPin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Emergency Key Generation */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Emergency Recovery Key Document</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Generate a new key or print key document.</p>
              </div>
              <button
                type="button"
                onClick={() => setNewRecoveryKey(generateRecoveryKey())}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Generate New Key
              </button>
            </div>

            {newRecoveryKey ? (
              <RecoveryKeyCard
                recoveryKey={newRecoveryKey}
                businessName={recBusinessName}
                ceoName={recCeoName}
                contactPhone={recContactPhone}
              />
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Emergency key is active in database (Stored as secure offline hash).</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  KEY ACTIVE
                </span>
              </div>
            )}
          </div>

          {/* Authorization Password */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/60 space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
              Authorize Changes with Current Software Password *
            </label>
            <input
              type="password"
              required
              placeholder="Enter current password..."
              value={currentPassForRecovery}
              onChange={(e) => setCurrentPassForRecovery(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Save Recovery Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4 text-xs text-slate-800 dark:text-slate-200">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Security Audit Log History
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Local desktop record of all password reset attempts, recovery key usages, and security profile updates.
              </p>
            </div>
          </div>

          {securityLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              No security audit events recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-semibold">
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Security Event</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {securityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {formatDateTimePKT(log.timestamp)}
                      </td>
                      <td className="p-3 font-medium">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.event === 'password_reset_success' || log.event === 'recovery_key_used'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : log.event === 'password_reset_failed'
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          {log.event.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{log.details}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-[10px]">{log.ipAddress || 'Offline Local'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {onFactoryReset && (
        <FactoryResetModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          passwordHash={passwordHash}
          onConfirmReset={onFactoryReset}
        />
      )}
    </div>
  );
};
