import React, { useState, useEffect } from 'react';
import { BusinessProfile, PasswordRecoveryConfig, SecurityAuditLog } from '../types';
import { simpleHash } from '../lib/utils';
import {
  verifyRecoveryIdentity,
  verifyEmergencyKey,
  validateNewPassword,
  hashRecoveryKey,
  generateRecoveryKey,
  createSecurityLog,
} from '../lib/security';
import { RecoveryKeyCard } from './RecoveryKeyCard';
import { FactoryResetModal } from './FactoryResetModal';
import { LoginAnimatedBackground } from './LoginAnimatedBackground';
import {
  Lock,
  KeyRound,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Key,
  Shield,
  Clock,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

interface LockScreenProps {
  businessProfile: BusinessProfile | null;
  passwordHash: string;
  recoveryConfig?: PasswordRecoveryConfig | null;
  onUnlock: () => void;
  onPasswordReset: (
    newHash: string,
    updatedConfig?: PasswordRecoveryConfig,
    auditLog?: SecurityAuditLog
  ) => void;
  onLoadSampleData?: () => void;
  onFactoryReset?: (providedPassword: string) => boolean | void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  businessProfile,
  passwordHash,
  recoveryConfig,
  onUnlock,
  onPasswordReset,
  onLoadSampleData,
  onFactoryReset,
}) => {
  // Login State
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Recovery Mode Toggle
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'identity' | 'emergency_key'>('identity');
  const [recoveryStep, setRecoveryStep] = useState<'verify' | 'reset_password' | 'success'>('verify');

  // Recovery Form State (Identity Method)
  const [bNameInput, setBNameInput] = useState('');
  const [ceoInput, setCeoInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [answer1Input, setAnswer1Input] = useState('');
  const [answer2Input, setAnswer2Input] = useState('');
  const [pinInput, setPinInput] = useState('');

  // Emergency Key Method State
  const [emergencyKeyInput, setEmergencyKeyInput] = useState('');

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Lockout & State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Status & Error Messages
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState('');
  const [usedKeyFlow, setUsedKeyFlow] = useState(false);
  const [newRotatedKey, setNewRotatedKey] = useState<string | null>(null);

  // Lockout Timer countdown effect
  useEffect(() => {
    let timer: any = null;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [lockoutSeconds]);

  // Handle Main Unlock
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordHash || simpleHash(password) === passwordHash) {
      setIsFadingOut(true);
      setTimeout(() => {
        onUnlock();
      }, 500);
    } else {
      setLoginError(true);
      setPassword('');
    }
  };

  // Open Recovery Screen
  const handleOpenRecovery = () => {
    setIsRecoveryMode(true);
    setRecoveryStep('verify');
    setRecoveryError('');
    setRecoverySuccessMsg('');

    // Pre-fill default prompts if config available
    if (recoveryConfig) {
      if (!bNameInput && businessProfile?.name) setBNameInput(businessProfile.name);
      if (!ceoInput && businessProfile?.ceoName) setCeoInput(businessProfile.ceoName);
      if (!phoneInput && businessProfile?.phone) setPhoneInput(businessProfile.phone);
    }
  };

  // Back to Login
  const handleBackToLogin = () => {
    setIsRecoveryMode(false);
    setRecoveryStep('verify');
    setRecoveryError('');
    setRecoverySuccessMsg('');
    setNewPassword('');
    setConfirmPassword('');
    setPassword('');
  };

  // Verify Identity (Method 1)
  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (lockoutSeconds > 0) {
      return;
    }

    if (!recoveryConfig) {
      setRecoveryError(
        'No password recovery profile configured. Please contact system administrator or load demo data.'
      );
      return;
    }

    const isMatch = verifyRecoveryIdentity(recoveryConfig, {
      businessName: bNameInput,
      ceoName: ceoInput,
      contactPhone: phoneInput,
      answer1: answer1Input,
      answer2: answer2Input,
      recoveryPin: pinInput,
    });

    if (isMatch) {
      setFailedAttempts(0);
      setRecoverySuccessMsg('Identity verified successfully.');
      setRecoveryStep('reset_password');
      setUsedKeyFlow(false);
    } else {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);

      if (nextFail >= 5) {
        setLockoutSeconds(60);
        setRecoveryError(
          'Too many failed recovery attempts. Password recovery locked for 60 seconds.'
        );
      } else {
        // Generic failure message (does not reveal specific field)
        setRecoveryError(
          'Verification failed. Please check your recovery information and try again.'
        );
      }

      // Log audit
      const log = createSecurityLog(
        'password_reset_failed',
        `Failed identity verification recovery attempt (Attempt ${nextFail}).`
      );
      onPasswordReset(passwordHash, recoveryConfig, log);
    }
  };

  // Verify Emergency Key (Method 2)
  const handleVerifyEmergencyKey = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (lockoutSeconds > 0) {
      return;
    }

    if (!recoveryConfig) {
      setRecoveryError('No password recovery profile configured.');
      return;
    }

    const isKeyValid = verifyEmergencyKey(recoveryConfig, emergencyKeyInput);

    if (isKeyValid) {
      setFailedAttempts(0);
      setRecoverySuccessMsg('Emergency Recovery Key verified successfully.');
      setRecoveryStep('reset_password');
      setUsedKeyFlow(true);
    } else {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);

      if (nextFail >= 5) {
        setLockoutSeconds(60);
        setRecoveryError('Too many failed attempts. Recovery locked for 60 seconds.');
      } else {
        setRecoveryError('Verification failed. Invalid emergency recovery key.');
      }

      const log = createSecurityLog(
        'password_reset_failed',
        `Failed emergency recovery key verification attempt (Attempt ${nextFail}).`
      );
      onPasswordReset(passwordHash, recoveryConfig, log);
    }
  };

  // Submit Reset Password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    const passCheck = validateNewPassword(newPassword);
    if (!passCheck.valid) {
      setRecoveryError(passCheck.message || 'Invalid password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError('Password confirmation does not match.');
      return;
    }

    const newHash = simpleHash(newPassword);
    let updatedConfig = recoveryConfig ? { ...recoveryConfig } : undefined;
    let nextRotatedKey: string | null = null;

    // If emergency key was used, rotate the key
    if (usedKeyFlow && updatedConfig) {
      nextRotatedKey = generateRecoveryKey();
      updatedConfig.recoveryKeyHash = hashRecoveryKey(nextRotatedKey);
      updatedConfig.updatedAt = new Date().toISOString();
      setNewRotatedKey(nextRotatedKey);
    }

    const log = createSecurityLog(
      usedKeyFlow ? 'recovery_key_used' : 'password_reset_success',
      usedKeyFlow
        ? 'Master password successfully reset using Emergency Recovery Key. Key automatically rotated.'
        : 'Master password successfully reset via identity & security question verification.'
    );

    onPasswordReset(newHash, updatedConfig, log);
    setRecoveryStep('success');
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-blue-600 selection:text-white transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Premium Animated Financial Background */}
      <LoginAnimatedBackground isFadingOut={isFadingOut} />

      <div
        className={`relative z-10 max-w-xl w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200/90 my-8 transition-all duration-500 ease-out animate-fade-in ${
          isFadingOut
            ? 'opacity-0 scale-95 translate-y-2 filter blur-xs'
            : 'opacity-100 scale-100'
        }`}
      >
        {/* Header Banner */}
        <div className="bg-slate-900 p-6 text-center text-white relative border-b border-slate-800">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3 text-white font-bold text-xl border border-blue-400/30">
            {businessProfile?.logoUrl ? (
              <img
                src={businessProfile.logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              'LP'
            )}
          </div>
          <h2 className="text-lg font-bold text-white">
            {businessProfile?.name || 'LedgerPro Accounting & Invoicing'}
          </h2>
          <p className="text-slate-400 text-xs mt-1 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            {isRecoveryMode ? 'Offline Password Recovery System' : 'Software Locked • Enter Password to Access'}
          </p>
        </div>

        {/* ---------------- LOGIN VIEW ---------------- */}
        {!isRecoveryMode ? (
          <form onSubmit={handleUnlock} className="p-6 md:p-8 space-y-5">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>Incorrect password. Please try again.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Password
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter software password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(false);
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" /> Unlock Application
            </button>

            {/* Clearly Visible Forgot Password & Factory Reset Buttons */}
            <div className="pt-2 flex items-center justify-center gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={handleOpenRecovery}
                className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" /> Forgot Password?
              </button>

              {onFactoryReset && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-500" /> Factory Reset
                  </button>
                </>
              )}
            </div>

            {onLoadSampleData && (
              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={onLoadSampleData}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Load Sample Printing Studio Demo Data
                </button>
              </div>
            )}
          </form>
        ) : (
          /* ---------------- PASSWORD RECOVERY MODE ---------------- */
          <div className="p-6 md:p-8 space-y-6">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Login
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                100% Offline Recovery
              </span>
            </div>

            {/* Lockout Warning */}
            {lockoutSeconds > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Recovery locked due to failed attempts. Please wait <strong>{lockoutSeconds}s</strong> before retrying.
                </span>
              </div>
            )}

            {/* Error Message */}
            {recoveryError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{recoveryError}</span>
              </div>
            )}

            {/* Success Message */}
            {recoverySuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{recoverySuccessMsg}</span>
              </div>
            )}

            {/* STEP 1: VERIFICATION SCREEN */}
            {recoveryStep === 'verify' && (
              <div className="space-y-5">
                {/* Method Selector Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMethod('identity');
                      setRecoveryError('');
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition ${
                      recoveryMethod === 'identity'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Identity & Security Qs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMethod('emergency_key');
                      setRecoveryError('');
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition ${
                      recoveryMethod === 'emergency_key'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Emergency Recovery Key
                  </button>
                </div>

                {/* METHOD 1: IDENTITY & SECURITY QUESTIONS */}
                {recoveryMethod === 'identity' ? (
                  <form onSubmit={handleVerifyIdentity} className="space-y-4 text-xs text-slate-800">
                    <p className="text-[11px] text-slate-500">
                      Enter your registered business identity details, security answers, and secret PIN to verify ownership.
                    </p>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Business Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter business name..."
                        value={bNameInput}
                        onChange={(e) => setBNameInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Owner / CEO Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter owner name..."
                          value={ceoInput}
                          onChange={(e) => setCeoInput(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Registered Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter phone number..."
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Question 1 */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Q1: {recoveryConfig?.securityQuestion1 || 'Security Question 1'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter Answer 1..."
                        value={answer1Input}
                        onChange={(e) => setAnswer1Input(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Question 2 */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Q2: {recoveryConfig?.securityQuestion2 || 'Security Question 2'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter Answer 2..."
                        value={answer2Input}
                        onChange={(e) => setAnswer2Input(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Secret PIN */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Secret Recovery PIN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Enter 4-8 digit recovery PIN..."
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={lockoutSeconds > 0}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      VERIFY IDENTITY &rarr;
                    </button>
                  </form>
                ) : (
                  /* METHOD 2: EMERGENCY RECOVERY KEY */
                  <form onSubmit={handleVerifyEmergencyKey} className="space-y-4 text-xs text-slate-800">
                    <p className="text-[11px] text-slate-500">
                      Enter your master Emergency Recovery Key (e.g., <code>AFPS-7K92-XP41-8M6Q</code>) generated during setup or printed on your recovery document.
                    </p>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Emergency Recovery Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AFPS-7K92-XP41-8M6Q"
                        value={emergencyKeyInput}
                        onChange={(e) => setEmergencyKeyInput(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm tracking-widest text-center uppercase font-bold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={lockoutSeconds > 0}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Key className="w-4 h-4" /> VERIFY RECOVERY KEY &rarr;
                    </button>
                  </form>
                )}

                {onFactoryReset && (
                  <div className="pt-4 border-t border-slate-100 text-center space-y-1">
                    <p className="text-[11px] text-slate-500">Forgot password & recovery details?</p>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-500" /> Reset All Software Data & Start Fresh
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: RESET PASSWORD SCREEN */}
            {recoveryStep === 'reset_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs text-slate-800">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-600" /> Create New Password
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Your identity has been verified. Enter a new password for your accounting software.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Minimum 8 characters..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Must be at least 8 characters long</span>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 mb-1">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> RESET PASSWORD NOW
                </button>
              </form>
            )}

            {/* STEP 3: SUCCESS SCREEN */}
            {recoveryStep === 'success' && (
              <div className="space-y-5 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900">Password Changed Successfully!</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Password changed successfully. You can now log in using your new password.
                  </p>
                </div>

                {newRotatedKey && (
                  <div className="text-left space-y-2 pt-2">
                    <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      Because you recovered access using your Emergency Recovery Key, a new key has been automatically generated for maximum security.
                    </p>
                    <RecoveryKeyCard
                      recoveryKey={newRotatedKey}
                      businessName={businessProfile?.name}
                      ceoName={businessProfile?.ceoName}
                      contactPhone={businessProfile?.phone}
                    />
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    BACK TO LOGIN
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {onFactoryReset && (
        <FactoryResetModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          passwordHash={passwordHash}
          requirePassword={false}
          onConfirmReset={onFactoryReset}
        />
      )}
    </div>
  );
};
