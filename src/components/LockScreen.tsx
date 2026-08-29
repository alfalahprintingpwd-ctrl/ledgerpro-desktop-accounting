import React, { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BusinessProfile, PasswordRecoveryConfig, SecurityAuditLog } from '../types';
import { verifyPassword, hashPassword } from '../lib/crypto';
import {
  verifyRecoveryIdentity,
  verifyEmergencyKey,
  validateNewPassword,
  hashRecoveryKey,
  generateRecoveryKey,
  createSecurityLog,
} from '../lib/security';
import { RecoveryKeyCard } from './RecoveryKeyCard';
import { LoginAnimatedBackground } from './LoginAnimatedBackground';
import { ThemeToggle } from './ThemeToggle';
import {
  Lock,
  KeyRound,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Shield,
  Clock,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
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
}

export const LockScreen: React.FC<LockScreenProps> = ({
  businessProfile,
  passwordHash,
  recoveryConfig,
  onUnlock,
  onPasswordReset,
}) => {
  // Login State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener?.('change', handleChange);
    return () => mq.removeEventListener?.('change', handleChange);
  }, []);

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

  // Handle Main Unlock with smooth authentication transition
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating) return;

    setIsAuthenticating(true);

    setTimeout(() => {
      if (!passwordHash || verifyPassword(password, passwordHash)) {
        setIsFadingOut(true);
        setTimeout(() => {
          onUnlock();
        }, 550);
      } else {
        setIsAuthenticating(false);
        setLoginError(true);
        setShakeCount((prev) => prev + 1);
        setPassword('');
      }
    }, 280);
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
    setLoginError(false);
    setIsAuthenticating(false);
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
      setShakeCount((prev) => prev + 1);
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
      setShakeCount((prev) => prev + 1);

      if (nextFail >= 5) {
        setLockoutSeconds(60);
        setRecoveryError(
          'Too many failed recovery attempts. Password recovery locked for 60 seconds.'
        );
      } else {
        setRecoveryError(
          'Verification failed. Please check your recovery information and try again.'
        );
      }

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
      setShakeCount((prev) => prev + 1);
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
      setShakeCount((prev) => prev + 1);

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
      setShakeCount((prev) => prev + 1);
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError('Password confirmation does not match.');
      setShakeCount((prev) => prev + 1);
      return;
    }

    const newHash = hashPassword(newPassword);
    let updatedConfig = recoveryConfig ? { ...recoveryConfig } : undefined;
    let nextRotatedKey: string | null = null;

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

  // Form Staged Animation Variants
  const cardVariants = {
    initial: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 24, scale: 0.93, filter: 'blur(8px)' },
    animate: prefersReducedMotion
      ? { opacity: 1 }
      : {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          transition: {
            duration: 0.75,
            ease: [0.16, 1, 0.3, 1], // Smooth cinematic desktop ease-out curve
          },
        },
    exit: prefersReducedMotion
      ? { opacity: 0 }
      : {
          opacity: 0,
          y: -14,
          scale: 0.96,
          filter: 'blur(4px)',
          transition: {
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
          },
        },
  };

  const logoVariants = {
    initial: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.9, y: 10 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: prefersReducedMotion ? 0 : 0.38,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const headingVariants = {
    initial: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: prefersReducedMotion ? 0 : 0.55,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const passwordFieldVariants = {
    initial: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 14, scale: 0.97 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: prefersReducedMotion ? 0 : 0.72,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const loginButtonVariants = {
    initial: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 14, scale: 0.96 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: prefersReducedMotion ? 0 : 0.88,
        duration: 0.42,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const forgotPasswordVariants = {
    initial: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: prefersReducedMotion ? 0 : 1.02,
        duration: 0.38,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const modeContentVariants = {
    initial: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 12 },
    animate: prefersReducedMotion
      ? { opacity: 1 }
      : {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          },
        },
    exit: prefersReducedMotion
      ? { opacity: 0 }
      : {
          opacity: 0,
          y: -10,
          transition: {
            duration: 0.25,
            ease: 'easeIn',
          },
        },
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-blue-600 selection:text-white transition-opacity duration-700 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Existing Premium Animated Financial Background */}
      <LoginAnimatedBackground isFadingOut={isFadingOut} />

      {/* Center Subtle Glow/Light for Card Emergence */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-[radial-gradient(circle,rgba(59,130,246,0.16)_0%,rgba(37,99,235,0.06)_45%,transparent_70%)] pointer-events-none rounded-full blur-2xl animate-center-glow z-0"
        aria-hidden="true"
      />

      {/* Floating Theme Toggle on Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle variant="compact" />
      </div>

      {/* Animated Login Form Card Container */}
      <motion.div
        key="login-main-card"
        variants={cardVariants}
        initial="initial"
        animate={isFadingOut ? 'exit' : 'animate'}
        className={`relative z-10 max-w-xl w-full bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden border border-white/40 dark:border-slate-800/90 ring-1 ring-slate-900/5 dark:ring-white/10 my-8 transition-transform duration-300 ${
          shakeCount > 0 ? 'animate-login-shake' : ''
        }`}
        onAnimationEnd={() => {
          // Reset shake class state after animation completes
          if (shakeCount > 0) {
            setShakeCount(0);
          }
        }}
      >
        {/* Subtle Traveling Border Tracer Effect */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl z-20"
          style={{ borderRadius: '1rem' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="borderRevealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect
            x="1"
            y="1"
            width="calc(100% - 2px)"
            height="calc(100% - 2px)"
            rx="15"
            fill="none"
            stroke="url(#borderRevealGradient)"
            strokeWidth="1.5"
            strokeDasharray="400"
            strokeDashoffset="400"
            className="animate-border-tracer"
          />
        </svg>

        {/* Header Banner */}
        <div className="bg-slate-900 dark:bg-slate-950 p-6 text-center text-white relative border-b border-slate-800/90">
          {/* Logo Reveal */}
          <motion.div
            variants={logoVariants}
            initial="initial"
            animate="animate"
            className="w-14 h-14 bg-gradient-to-tr from-blue-700 to-blue-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-900/40 mb-3 text-white font-bold text-xl border border-blue-400/30 transition-transform duration-300 hover:scale-105"
          >
            {businessProfile?.logoUrl ? (
              <img
                src={businessProfile.logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              'LP'
            )}
          </motion.div>

          {/* Heading & Subtitle Reveal */}
          <motion.div variants={headingVariants} initial="initial" animate="animate">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {businessProfile?.name || 'LedgerPro Accounting & Invoicing'}
            </h2>
            <p className="text-slate-400 text-xs mt-1 flex items-center justify-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              {isRecoveryMode
                ? 'Offline Password Recovery System'
                : 'Software Locked • Enter Password to Access'}
            </p>
          </motion.div>
        </div>

        {/* Animated Modes Wrapper (Login vs Recovery) */}
        <AnimatePresence mode="wait">
          {!isRecoveryMode ? (
            /* ---------------- LOGIN VIEW ---------------- */
            <motion.form
              key="login-form-view"
              variants={modeContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleUnlock}
              className="p-6 md:p-8 space-y-5"
            >
              {loginError && (
                <div className="animate-login-error-msg p-3.5 bg-red-50/90 dark:bg-red-950/60 border border-red-200/90 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2.5 shadow-xs">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="font-medium">Incorrect password. Please try again.</span>
                </div>
              )}

              {/* Password Field Reveal */}
              <motion.div
                variants={passwordFieldVariants}
                initial="initial"
                animate="animate"
              >
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound
                      className={`w-3.5 h-3.5 transition-colors duration-300 ${
                        isInputFocused
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    Master Password
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    disabled={isAuthenticating}
                    placeholder="Enter software password..."
                    value={password}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(false);
                    }}
                    className={`w-full px-4 py-3.5 pr-11 rounded-xl border bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium outline-none transition-all duration-300 ease-out ${
                      isInputFocused
                        ? 'border-blue-500 ring-4 ring-blue-500/15 shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                        : 'border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600'
                    } ${isAuthenticating ? 'opacity-80 cursor-wait' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={isAuthenticating}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Login Button Reveal with subtle hover/press animations */}
              <motion.div
                variants={loginButtonVariants}
                initial="initial"
                animate="animate"
              >
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-blue-600/30 dark:hover:shadow-blue-500/25 transition-all duration-200 ease-out flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider hover:-translate-y-0.5 hover:scale-[1.012] active:scale-[0.985] active:translate-y-0 disabled:opacity-85 disabled:cursor-wait"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>AUTHENTICATING...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>LOGIN</span>
                    </>
                  )}
                </button>
              </motion.div>

              {/* Forgot Password Link with smooth reveal & hover animation */}
              <motion.div
                variants={forgotPasswordVariants}
                initial="initial"
                animate="animate"
                className="pt-2 text-center"
              >
                <button
                  type="button"
                  disabled={isAuthenticating}
                  onClick={handleOpenRecovery}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>Forgot Password?</span>
                </button>
              </motion.div>
            </motion.form>
          ) : (
            /* ---------------- PASSWORD RECOVERY MODE ---------------- */
            <motion.div
              key="recovery-form-view"
              variants={modeContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="p-6 md:p-8 space-y-6"
            >
              {/* Top Navigation Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-x-0.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Login
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  100% Offline Recovery
                </span>
              </div>

              {/* Lockout Warning */}
              {lockoutSeconds > 0 && (
                <div className="animate-login-error-msg p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Recovery locked due to failed attempts. Please wait <strong>{lockoutSeconds}s</strong> before retrying.
                  </span>
                </div>
              )}

              {/* Error Message */}
              {recoveryError && (
                <div className="animate-login-error-msg p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2 shadow-xs">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{recoveryError}</span>
                </div>
              )}

              {/* Success Message */}
              {recoverySuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium">{recoverySuccessMsg}</span>
                </div>
              )}

              {/* STEP 1: VERIFICATION SCREEN */}
              {recoveryStep === 'verify' && (
                <div className="space-y-5">
                  {/* Method Selector Tabs */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryMethod('identity');
                        setRecoveryError('');
                      }}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        recoveryMethod === 'identity'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs scale-[1.01]'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        recoveryMethod === 'emergency_key'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs scale-[1.01]'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Emergency Recovery Key
                    </button>
                  </div>

                  {/* METHOD 1: IDENTITY & SECURITY QUESTIONS */}
                  {recoveryMethod === 'identity' ? (
                    <form onSubmit={handleVerifyIdentity} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Enter your registered business identity details, security answers, and secret PIN to verify ownership.
                      </p>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Business Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter business name..."
                          value={bNameInput}
                          onChange={(e) => setBNameInput(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Owner / CEO Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter owner name..."
                            value={ceoInput}
                            onChange={(e) => setCeoInput(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Registered Phone <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter phone number..."
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                          />
                        </div>
                      </div>

                      {/* Question 1 */}
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          Q1: {recoveryConfig?.securityQuestion1 || 'Security Question 1'}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Answer 1..."
                          value={answer1Input}
                          onChange={(e) => setAnswer1Input(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                      </div>

                      {/* Question 2 */}
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          Q2: {recoveryConfig?.securityQuestion2 || 'Security Question 2'}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Answer 2..."
                          value={answer2Input}
                          onChange={(e) => setAnswer2Input(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                      </div>

                      {/* Secret PIN */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Secret Recovery PIN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Enter 4-8 digit recovery PIN..."
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={lockoutSeconds > 0}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.985]"
                      >
                        VERIFY IDENTITY &rarr;
                      </button>
                    </form>
                  ) : (
                    /* METHOD 2: EMERGENCY RECOVERY KEY */
                    <form onSubmit={handleVerifyEmergencyKey} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Enter your master Emergency Recovery Key (e.g., <code>AFPS-7K92-XP41-8M6Q</code>) generated during setup or printed on your recovery document.
                      </p>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Emergency Recovery Key <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. AFPS-7K92-XP41-8M6Q"
                          value={emergencyKeyInput}
                          onChange={(e) => setEmergencyKeyInput(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm tracking-widest text-center uppercase font-bold transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={lockoutSeconds > 0}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-[0.985]"
                      >
                        <Key className="w-4 h-4" /> VERIFY RECOVERY KEY &rarr;
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* STEP 2: RESET PASSWORD SCREEN */}
              {recoveryStep === 'reset_password' && (
                <form onSubmit={handleResetPassword} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Create New Password
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Your identity has been verified. Enter a new password for your accounting software.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-300 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      placeholder="Minimum 8 characters..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Must be at least 8 characters long</span>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-300 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Re-enter new password..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-[0.985]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> RESET PASSWORD NOW
                  </button>
                </form>
              )}

              {/* STEP 3: SUCCESS SCREEN */}
              {recoveryStep === 'success' && (
                <div className="space-y-5 text-center">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full mx-auto flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Password Changed Successfully!</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Password changed successfully. You can now log in using your new password.
                    </p>
                  </div>

                  {newRotatedKey && (
                    <div className="text-left space-y-2 pt-2">
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
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
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all duration-200 cursor-pointer uppercase tracking-wider hover:-translate-y-0.5 active:scale-[0.985]"
                    >
                      BACK TO LOGIN
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};


