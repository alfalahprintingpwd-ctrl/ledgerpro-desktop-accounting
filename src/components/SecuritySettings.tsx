import React, { useState } from 'react';
import { PasswordRecoveryConfig, SecurityAuditLog, BusinessProfile } from '../types';
import { simpleHash, formatDateTimePKT } from '../lib/utils';
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

    if (passwordHash && simpleHash(currentPassword) !== passwordHash) {
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

    const newHash = simpleHash(newPassword);
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

    if (passwordHash && simpleHash(currentPassForRecovery) !== passwordHash) {
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
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`pb-2 transition ${
            activeTab === 'password'
              ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
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
          className={`pb-2 transition ${
            activeTab === 'recovery'
              ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
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
          className={`pb-2 transition ${
            activeTab === 'logs'
              ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Security Audit Logs ({securityLogs.length})
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: CHANGE PASSWORD */}
      {activeTab === 'password' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form
            onSubmit={handleChangePassword}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs text-slate-800"
          >
            <h2 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" /> Change Software Password
            </h2>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                placeholder="Minimum 8 characters..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="space-y-2">
                <h2 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" /> Immediate Software Lock
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lock the application screen immediately. Re-entering your password will be required to unlock and resume editing.
                </p>
              </div>

              <button
                type="button"
                onClick={onLock}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-400" /> Lock Software Now
              </button>
            </div>

            {onFactoryReset && (
              <div className="bg-red-50/50 rounded-2xl border border-red-200 p-6 shadow-2xs space-y-4">
                <div className="space-y-2">
                  <h2 className="font-bold text-sm text-red-900 border-b border-red-200/60 pb-2 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-red-600" /> Factory / First-Run State Reset
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Permanently clear all local testing data, business settings, master password, and recovery keys to return the software to its first-run state.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Trash2 className="w-4 h-4" /> Reset Software to Factory State
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
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5 text-xs text-slate-800"
        >
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" /> Offline Password Recovery Profile
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Update security questions, answers, and recovery PIN. (Note: Security answers and PIN are stored as secure hashes and never displayed in plain text).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={recBusinessName}
                onChange={(e) => setRecBusinessName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Owner / CEO Name *</label>
              <input
                type="text"
                required
                value={recCeoName}
                onChange={(e) => setRecCeoName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registered Phone *</label>
              <input
                type="text"
                required
                value={recContactPhone}
                onChange={(e) => setRecContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Security Questions & Answers */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs">Security Questions</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question 1</label>
                <input
                  type="text"
                  required
                  value={question1}
                  onChange={(e) => setQuestion1(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Answer 1 (Leave blank to keep existing)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question 2</label>
                <input
                  type="text"
                  required
                  value={question2}
                  onChange={(e) => setQuestion2(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Answer 2 (Leave blank to keep existing)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block font-semibold text-slate-700 mb-1">New Recovery PIN (Leave blank to keep existing)</label>
              <input
                type="password"
                placeholder="••••"
                value={recoveryPin}
                onChange={(e) => setRecoveryPin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Emergency Key Generation */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs">Emergency Recovery Key Document</h3>
                <p className="text-[11px] text-slate-500">Generate a new key or print key document.</p>
              </div>
              <button
                type="button"
                onClick={() => setNewRecoveryKey(generateRecoveryKey())}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" /> Generate New Key
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
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <span>Emergency key is active in database (Stored as secure offline hash).</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  KEY ACTIVE
                </span>
              </div>
            )}
          </div>

          {/* Authorization Password */}
          <div className="pt-3 border-t border-slate-100 bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
            <label className="block font-bold text-slate-800 text-xs">
              Authorize Changes with Current Software Password *
            </label>
            <input
              type="password"
              required
              placeholder="Enter current password..."
              value={currentPassForRecovery}
              onChange={(e) => setCurrentPassForRecovery(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs text-slate-800">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" /> Security Audit Log History
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Local desktop record of all password reset attempts, recovery key usages, and security profile updates.
              </p>
            </div>
          </div>

          {securityLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic bg-slate-50 rounded-xl">
              No security audit events recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold">
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Security Event</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {securityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {formatDateTimePKT(log.timestamp)}
                      </td>
                      <td className="p-3 font-medium">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.event === 'password_reset_success' || log.event === 'recovery_key_used'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.event === 'password_reset_failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.event.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{log.details}</td>
                      <td className="p-3 text-slate-500 font-mono text-[10px]">{log.ipAddress || 'Offline Local'}</td>
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
