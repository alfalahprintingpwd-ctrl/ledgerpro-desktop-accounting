import React, { useState } from 'react';
import { BusinessProfile, PasswordRecoveryConfig, SecurityAuditLog } from '../types';
import { simpleHash } from '../lib/utils';
import { hashPassword } from '../lib/crypto';
import {
  generateRecoveryKey,
  hashAnswer,
  hashRecoveryKey,
  validateNewPassword,
  createSecurityLog,
} from '../lib/security';
import { RecoveryKeyCard } from './RecoveryKeyCard';
import { compressImage } from '../lib/imageUtils';
import { Building2, Key, Upload, CheckCircle2, ShieldCheck, FileText, Lock, Shield, RefreshCw } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface SetupWizardProps {
  onComplete: (
    profile: BusinessProfile,
    passwordHash: string,
    recoveryConfig: PasswordRecoveryConfig,
    initialLog: SecurityAuditLog
  ) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Business Info State
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [ceoSignatureUrl, setCeoSignatureUrl] = useState<string>('');
  const [businessStampUrl, setBusinessStampUrl] = useState<string>('');

  // Config defaults
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [currencySymbol, setCurrencySymbol] = useState('Rs. ');
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(5);

  // Password & Recovery State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [recBusinessName, setRecBusinessName] = useState('');
  const [recCeoName, setRecCeoName] = useState('');
  const [recContactPhone, setRecContactPhone] = useState('');

  const [question1, setQuestion1] = useState('What was the name of your first school or college?');
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState('What is your primary registration city or bank location?');
  const [answer2, setAnswer2] = useState('');

  const [recoveryPin, setRecoveryPin] = useState('');
  const [recoveryKey, setRecoveryKey] = useState(() => generateRecoveryKey());

  const [error, setError] = useState('');

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    isSignatureOrStamp: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, {
          maxWidth: isSignatureOrStamp ? 350 : 300,
          maxHeight: isSignatureOrStamp ? 150 : 300,
          quality: 0.85,
          format: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        });
        setter(compressed);
      } catch (err) {
        console.error('Image compression failed, using fallback', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setter(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Business Name is required.');
      return;
    }
    if (!address.trim()) {
      setError('Business Address is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone Number is required.');
      return;
    }
    if (!ceoName.trim()) {
      setError('CEO / Owner Name is required.');
      return;
    }
    setError('');

    // Prefill recovery verification values from Step 1
    if (!recBusinessName) setRecBusinessName(name.trim());
    if (!recCeoName) setRecCeoName(ceoName.trim());
    if (!recContactPhone) setRecContactPhone(phone.trim());

    setStep(2);
  };

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate Password
    const passCheck = validateNewPassword(password);
    if (!passCheck.valid) {
      setError(passCheck.message || 'Invalid password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate Recovery Info
    if (!recBusinessName.trim() || !recCeoName.trim() || !recContactPhone.trim()) {
      setError('Business Name, Owner Name, and Contact Number are required for recovery setup.');
      return;
    }
    if (!answer1.trim()) {
      setError('Please provide an answer to Security Question 1.');
      return;
    }
    if (!answer2.trim()) {
      setError('Please provide an answer to Security Question 2.');
      return;
    }
    if (!recoveryPin.trim() || recoveryPin.trim().length < 4) {
      setError('Secret Recovery PIN is mandatory (minimum 4 digits/characters).');
      return;
    }

    const profile: BusinessProfile = {
      name: name.trim(),
      logoUrl,
      address: address.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      email: email.trim(),
      website: website.trim(),
      taxRegistrationNumber: taxRegistrationNumber.trim(),
      ceoName: ceoName.trim(),
      ceoSignatureUrl,
      businessStampUrl,
      invoicePrefix: invoicePrefix.trim() || 'INV-',
      nextInvoiceSeq: 1001,
      expensePrefix: 'EXP-',
      nextExpenseSeq: 1001,
      currencySymbol: currencySymbol || '$',
      defaultTaxRate: Number(defaultTaxRate) || 0,
      invoiceFooterNote: `Thank you for choosing ${name.trim()}!`,
      autoLockMinutes: 0,
    };

    const passwordHash = hashPassword(password);

    const recoveryConfig: PasswordRecoveryConfig = {
      businessName: recBusinessName.trim(),
      ceoName: recCeoName.trim(),
      contactPhone: recContactPhone.trim(),
      securityQuestion1: question1.trim(),
      securityAnswerHash1: hashAnswer(answer1),
      securityQuestion2: question2.trim(),
      securityAnswerHash2: hashAnswer(answer2),
      recoveryPinHash: simpleHash(recoveryPin.trim()),
      recoveryKeyHash: hashRecoveryKey(recoveryKey),
      updatedAt: new Date().toISOString(),
    };

    const initialLog = createSecurityLog(
      'recovery_setup_updated',
      'Initial password and password recovery profile configured during setup wizard.'
    );

    onComplete(profile, passwordHash, recoveryConfig, initialLog);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center p-4 transition-colors">
      <div className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 md:p-8 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm mb-1">
              <Building2 className="w-4 h-4" /> Initial Setup Wizard
            </div>
            <h1 className="text-2xl font-bold">LedgerPro Accounting & Invoicing</h1>
            <p className="text-slate-400 text-sm mt-1">
              Set up your business profile and security password to begin.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle variant="compact" />
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
                  step === 1
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-emerald-500 bg-emerald-600 text-white'
                }`}
              >
                1
              </div>
              <div className="w-6 h-0.5 bg-slate-700" />
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
                  step === 2
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                2
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNextStep} className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 1. Business & Contact Information
            </h2>

            {/* Logo & Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                {logoUrl ? (
                  <div className="relative group w-full flex flex-col items-center">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="max-h-28 object-contain mb-2 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                    >
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload Business Logo</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG or SVG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setLogoUrl)}
                    />
                  </label>
                )}
              </div>

              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alfalah Printing Studio"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      placeholder="+92 300 1234567"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Business Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Plot/Suite No, Street, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="contact@mybusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                />
              </div>
            </div>

            {/* Website & NTN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Website (Optional)
                </label>
                <input
                  type="text"
                  placeholder="www.mybusiness.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Registration / NTN Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="NTN: 1234567-8"
                  value={taxRegistrationNumber}
                  onChange={(e) => setTaxRegistrationNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                />
              </div>
            </div>

            {/* CEO & Signatures */}
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pt-4 pb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Executive & Stamp Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  CEO / Owner Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohammad Farooq"
                  value={ceoName}
                  onChange={(e) => setCeoName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                />
              </div>

              {/* CEO Signature Upload */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50 text-center">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  CEO Signature Image
                </label>
                {ceoSignatureUrl ? (
                  <div className="flex flex-col items-center">
                    <img src={ceoSignatureUrl} alt="Signature" className="h-12 object-contain my-1" />
                    <button
                      type="button"
                      onClick={() => setCeoSignatureUrl('')}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium py-1">
                    <Upload className="w-3.5 h-3.5" /> Upload Signature
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setCeoSignatureUrl)}
                    />
                  </label>
                )}
              </div>

              {/* Business Stamp Upload */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50 text-center">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Business Stamp Image
                </label>
                {businessStampUrl ? (
                  <div className="flex flex-col items-center">
                    <img src={businessStampUrl} alt="Stamp" className="h-12 object-contain my-1" />
                    <button
                      type="button"
                      onClick={() => setBusinessStampUrl('')}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium py-1">
                    <Upload className="w-3.5 h-3.5" /> Upload Stamp
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setBusinessStampUrl)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Currency & Tax Config */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rs. or $"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  placeholder="INV-"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                Continue to Password Setup &rarr;
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFinalize} className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 2. Security Password & Offline Password Recovery Setup
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Create a main software password and set up your offline password recovery credentials. Because this software operates completely offline without internet or email, these recovery details and secret key will allow you to safely reset your password if forgotten.
            </p>

            {/* Password Fields */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Main Software Password
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Create Software Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm bg-white dark:bg-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Must be at least 8 characters long</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Confirm Software Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 text-sm bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Business Verification Information */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Business Identity Verification Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recBusinessName}
                    onChange={(e) => setRecBusinessName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Owner / CEO Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recCeoName}
                    onChange={(e) => setRecCeoName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registered Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recContactPhone}
                    onChange={(e) => setRecContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Security Questions & Answers */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Security Questions & Answers
              </h3>

              {/* Question 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Security Question 1 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={question1}
                    onChange={(e) => setQuestion1(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800"
                  >
                    <option value="What was the name of your first school or college?">What was the name of your first school or college?</option>
                    <option value="What city or town were you born in?">What city or town were you born in?</option>
                    <option value="What is your primary commercial bank name?">What is your primary commercial bank name?</option>
                    <option value="What was the name of your first printing/business project?">What was the name of your first printing/business project?</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Answer 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter answer for question 1..."
                    value={answer1}
                    onChange={(e) => setAnswer1(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Question 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Security Question 2 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={question2}
                    onChange={(e) => setQuestion2(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800"
                  >
                    <option value="What is your primary registration city or bank location?">What is your primary registration city or bank location?</option>
                    <option value="What was your mother's maiden name?">What was your mother's maiden name?</option>
                    <option value="What was the make or model of your first vehicle?">What was the make or model of your first vehicle?</option>
                    <option value="What is your favorite book, film or quote?">What is your favorite book, film or quote?</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Answer 2 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter answer for question 2..."
                    value={answer2}
                    onChange={(e) => setAnswer2(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Recovery PIN */}
              <div className="max-w-xs pt-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Secret Recovery PIN (Mandatory) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="4 to 8 digit secret PIN..."
                  value={recoveryPin}
                  onChange={(e) => setRecoveryPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Stored as a secure offline hash</span>
              </div>
            </div>

            {/* Emergency Recovery Key Section */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-500" /> Emergency Recovery Key
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Alternative 1-click master key to recover access if security answers are forgotten.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecoveryKey(generateRecoveryKey())}
                  className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Regenerate Key
                </button>
              </div>

              <RecoveryKeyCard
                recoveryKey={recoveryKey}
                businessName={recBusinessName || name}
                ceoName={recCeoName || ceoName}
                contactPhone={recContactPhone || phone}
              />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition"
              >
                &larr; Back to Business Info
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Setup & Launch Software
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
