import React, { useState, useEffect } from 'react';
import { BusinessProfile, SecurityAuditLog, Employee, Expense } from '../types';
import { compressImage } from '../lib/imageUtils';
import {
  Settings,
  Upload,
  Save,
  CheckCircle2,
  Building,
  FileText,
  Printer,
  FileCheck2,
  Lock,
  Unlock,
  KeyRound,
  X,
  ShieldCheck,
  Trash2,
  Image as ImageIcon,
  RotateCcw,
  Users,
  Receipt,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getPrintSettings, savePrintSettings, PrintSettings } from '../lib/print';
import { PrintTestPageModal } from './PrintTestPage';
import { verifyPassword } from '../lib/crypto';
import { createSecurityLog } from '../lib/security';
import { StaffSettings } from './StaffSettings';

interface BusinessSettingsProps {
  businessProfile: BusinessProfile | null;
  passwordHash?: string;
  onSaveProfile: (profile: BusinessProfile, auditLog?: SecurityAuditLog) => void;
  employees?: Employee[];
  expenses?: Expense[];
  onSaveEmployee?: (employee: Employee, auditLog?: SecurityAuditLog) => void;
  onDeleteEmployee?: (id: string, auditLog?: SecurityAuditLog) => void;
}

export const BusinessSettings: React.FC<BusinessSettingsProps> = ({
  businessProfile,
  passwordHash,
  onSaveProfile,
  employees = [],
  expenses = [],
  onSaveEmployee,
  onDeleteEmployee,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'financial' | 'staff' | 'printing'>('profile');

  // Editing state - Default locked/view mode until password verified
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Form Field States
  const [name, setName] = useState(businessProfile?.name || '');
  const [logoUrl, setLogoUrl] = useState<string>(businessProfile?.logoUrl || '');
  const [address, setAddress] = useState(businessProfile?.address || '');
  const [phone, setPhone] = useState(businessProfile?.phone || '');
  const [whatsapp, setWhatsapp] = useState(businessProfile?.whatsapp || '');
  const [email, setEmail] = useState(businessProfile?.email || '');
  const [website, setWebsite] = useState(businessProfile?.website || '');
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState(
    businessProfile?.taxRegistrationNumber || ''
  );
  const [ceoName, setCeoName] = useState(businessProfile?.ceoName || '');
  const [ceoSignatureUrl, setCeoSignatureUrl] = useState<string>(
    businessProfile?.ceoSignatureUrl || ''
  );
  const [businessStampUrl, setBusinessStampUrl] = useState<string>(
    businessProfile?.businessStampUrl || ''
  );

  const [invoicePrefix, setInvoicePrefix] = useState(businessProfile?.invoicePrefix || 'INV-');
  const [nextInvoiceSeq, setNextInvoiceSeq] = useState<number>(
    businessProfile?.nextInvoiceSeq || 1001
  );
  const [expensePrefix, setExpensePrefix] = useState(businessProfile?.expensePrefix || 'EXP-');
  const [nextExpenseSeq, setNextExpenseSeq] = useState<number>(
    businessProfile?.nextExpenseSeq || 1001
  );
  const [currencySymbol, setCurrencySymbol] = useState(businessProfile?.currencySymbol || '$');
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(
    businessProfile?.defaultTaxRate || 0
  );
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(
    businessProfile?.invoiceFooterNote || 'Thank you for your business!'
  );

  // Printing State
  const [printSettings, setPrintSettings] = useState<PrintSettings>(getPrintSettings());
  const [isTestPageOpen, setIsTestPageOpen] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Sync state if businessProfile changes from outside
  useEffect(() => {
    if (businessProfile) {
      setName(businessProfile.name || '');
      setLogoUrl(businessProfile.logoUrl || '');
      setAddress(businessProfile.address || '');
      setPhone(businessProfile.phone || '');
      setWhatsapp(businessProfile.whatsapp || '');
      setEmail(businessProfile.email || '');
      setWebsite(businessProfile.website || '');
      setTaxRegistrationNumber(businessProfile.taxRegistrationNumber || '');
      setCeoName(businessProfile.ceoName || '');
      setCeoSignatureUrl(businessProfile.ceoSignatureUrl || '');
      setBusinessStampUrl(businessProfile.businessStampUrl || '');
      setInvoicePrefix(businessProfile.invoicePrefix || 'INV-');
      setNextInvoiceSeq(businessProfile.nextInvoiceSeq || 1001);
      setExpensePrefix(businessProfile.expensePrefix || 'EXP-');
      setNextExpenseSeq(businessProfile.nextExpenseSeq || 1001);
      setCurrencySymbol(businessProfile.currencySymbol || '$');
      setDefaultTaxRate(businessProfile.defaultTaxRate || 0);
      setInvoiceFooterNote(
        businessProfile.invoiceFooterNote || 'Thank you for your business!'
      );
    }
  }, [businessProfile]);

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

  const handleOpenEditModal = () => {
    setPasswordError('');
    setEnteredPassword('');
    setShowPassword(false);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordHash || verifyPassword(enteredPassword, passwordHash)) {
      setIsEditing(true);
      setIsPasswordModalOpen(false);
      setPasswordError('');
      setEnteredPassword('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const handleCancelEditing = () => {
    if (businessProfile) {
      setName(businessProfile.name || '');
      setLogoUrl(businessProfile.logoUrl || '');
      setAddress(businessProfile.address || '');
      setPhone(businessProfile.phone || '');
      setWhatsapp(businessProfile.whatsapp || '');
      setEmail(businessProfile.email || '');
      setWebsite(businessProfile.website || '');
      setTaxRegistrationNumber(businessProfile.taxRegistrationNumber || '');
      setCeoName(businessProfile.ceoName || '');
      setCeoSignatureUrl(businessProfile.ceoSignatureUrl || '');
      setBusinessStampUrl(businessProfile.businessStampUrl || '');
      setInvoicePrefix(businessProfile.invoicePrefix || 'INV-');
      setNextInvoiceSeq(businessProfile.nextInvoiceSeq || 1001);
      setExpensePrefix(businessProfile.expensePrefix || 'EXP-');
      setNextExpenseSeq(businessProfile.nextExpenseSeq || 1001);
      setCurrencySymbol(businessProfile.currencySymbol || '$');
      setDefaultTaxRate(businessProfile.defaultTaxRate || 0);
      setInvoiceFooterNote(
        businessProfile.invoiceFooterNote || 'Thank you for your business!'
      );
    }
    setValidationError('');
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!name.trim()) {
      setValidationError('Business Name is required.');
      return;
    }
    if (!phone.trim()) {
      setValidationError('Phone Number is required.');
      return;
    }
    if (!address.trim()) {
      setValidationError('Business Address is required.');
      return;
    }
    if (!ceoName.trim()) {
      setValidationError('CEO / Owner Name is required.');
      return;
    }

    const updatedProfile: BusinessProfile = {
      name: name.trim(),
      logoUrl,
      address: address.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      website: website.trim(),
      taxRegistrationNumber: taxRegistrationNumber.trim(),
      ceoName: ceoName.trim(),
      ceoSignatureUrl,
      businessStampUrl,
      invoicePrefix: invoicePrefix.trim(),
      nextInvoiceSeq: Number(nextInvoiceSeq) || 1001,
      expensePrefix: expensePrefix.trim(),
      nextExpenseSeq: Number(nextExpenseSeq) || 1001,
      currencySymbol: currencySymbol || '$',
      defaultTaxRate: Number(defaultTaxRate) || 0,
      invoiceFooterNote: invoiceFooterNote.trim(),
      autoLockMinutes: businessProfile?.autoLockMinutes || 0,
    };

    // Calculate changed fields for Audit Log
    const changedFields: string[] = [];
    if (businessProfile) {
      if (businessProfile.name !== updatedProfile.name) {
        changedFields.push(`Name: '${businessProfile.name}' -> '${updatedProfile.name}'`);
      }
      if (businessProfile.phone !== updatedProfile.phone) changedFields.push('Phone Number');
      if (businessProfile.address !== updatedProfile.address) changedFields.push('Address');
      if (businessProfile.ceoName !== updatedProfile.ceoName) changedFields.push('CEO Name');
      if (businessProfile.logoUrl !== updatedProfile.logoUrl) changedFields.push('Logo');
      if (businessProfile.ceoSignatureUrl !== updatedProfile.ceoSignatureUrl) changedFields.push('Signature');
      if (businessProfile.businessStampUrl !== updatedProfile.businessStampUrl) changedFields.push('Stamp');
    }

    let auditLog: SecurityAuditLog | undefined;
    if (changedFields.length > 0) {
      const details =
        businessProfile && businessProfile.name !== updatedProfile.name
          ? `Business Name Changed. ${changedFields[0]}`
          : `Business details updated (${changedFields.join(', ')})`;
      auditLog = createSecurityLog('business_profile_updated', details);
    }

    onSaveProfile(updatedProfile, auditLog);
    savePrintSettings(printSettings);
    setSavedSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header & Edit Action Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Business Settings & Administration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure business identity, signatures, staff database, expense vouchers, and printing setup.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>CANCEL EDITING</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Lock className="w-4 h-4" />
              <span>EDIT SETTINGS & PROFILES</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Business Profile & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'financial'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Invoices & Expense Voucher Defaults</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'staff'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Employees Database ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('printing')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'printing'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Windows Printing & Hardware</span>
        </button>
      </div>

      {/* Lock/Edit Status Indicator Banner */}
      {!isEditing && activeTab !== 'staff' && (
        <div className="p-4 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Settings Locked:</strong> Details are protected from accidental modification. Click <strong>EDIT SETTINGS & PROFILES</strong> and enter your password to edit fields.
            </span>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">Settings updated successfully. All new vouchers, invoices, and reports will reflect these updates.</span>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
          <X className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* TAB 1 & 2 & 4 FORM */}
      {activeTab !== 'staff' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-6 text-xs text-slate-800 dark:text-slate-200"
        >
          {/* TAB 1: BUSINESS PROFILE & IDENTITY */}
          {activeTab === 'profile' && (
            <>
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Business Branding & Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Logo Card */}
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 text-center flex flex-col items-center justify-center min-h-[160px]">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Business Logo</span>
                    {logoUrl ? (
                      <div className="flex flex-col items-center space-y-2">
                        <img src={logoUrl} alt="Logo" className="max-h-24 object-contain rounded border border-slate-200 dark:border-slate-700 bg-white p-1" />
                        {isEditing && (
                          <div className="flex items-center gap-3">
                            <label className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-[11px] flex items-center gap-1">
                              <Upload className="w-3 h-3" /> Replace
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, setLogoUrl)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setLogoUrl('')}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : isEditing ? (
                      <label className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-1" />
                        <span className="font-semibold text-blue-600 dark:text-blue-400">Upload Logo</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">PNG, JPG, WEBP (&lt; 3MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setLogoUrl)}
                        />
                      </label>
                    ) : (
                      <div className="text-slate-400 dark:text-slate-500 text-center py-4">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                        <span className="text-[11px]">No Logo Uploaded</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!isEditing}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg outline-none font-bold text-sm ${
                          isEditing
                            ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                            : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="text"
                          required
                          disabled={!isEditing}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                            isEditing
                              ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                          WhatsApp Number
                        </label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                            isEditing
                              ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Business Address *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isEditing}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled={!isEditing}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Website URL
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="e.g. https://www.yourbusiness.com"
                      className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      NTN / Tax Registration Number
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={taxRegistrationNumber}
                      placeholder="e.g. NTN: 1234567-8"
                      className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* CEO & Business Stamps */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> CEO Signature & Official Business Stamp
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      CEO / Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isEditing}
                      value={ceoName}
                      onChange={(e) => setCeoName(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg outline-none font-bold ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* CEO Signature */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-center flex flex-col items-center justify-between min-h-[110px]">
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      CEO Digital Signature
                    </label>
                    {ceoSignatureUrl ? (
                      <div className="flex flex-col items-center space-y-1">
                        <img src={ceoSignatureUrl} alt="Signature" className="h-10 object-contain my-1 border border-slate-200 dark:border-slate-700 bg-white p-1 rounded" />
                        {isEditing && (
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer text-blue-600 dark:text-blue-400 font-semibold text-[10px] hover:underline">
                              Replace
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, setCeoSignatureUrl)}
                              />
                            </label>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <button
                              type="button"
                              onClick={() => setCeoSignatureUrl('')}
                              className="text-red-600 dark:text-red-400 font-semibold text-[10px] hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : isEditing ? (
                      <label className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline font-semibold block py-2 text-xs">
                        Upload Signature
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setCeoSignatureUrl)}
                        />
                      </label>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] py-3">No Signature Uploaded</span>
                    )}
                  </div>

                  {/* Business Stamp */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-center flex flex-col items-center justify-between min-h-[110px]">
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Official Business Stamp
                    </label>
                    {businessStampUrl ? (
                      <div className="flex flex-col items-center space-y-1">
                        <img src={businessStampUrl} alt="Stamp" className="h-10 object-contain my-1 border border-slate-200 dark:border-slate-700 bg-white p-1 rounded" />
                        {isEditing && (
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer text-blue-600 dark:text-blue-400 font-semibold text-[10px] hover:underline">
                              Replace
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, setBusinessStampUrl)}
                              />
                            </label>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <button
                              type="button"
                              onClick={() => setBusinessStampUrl('')}
                              className="text-red-600 dark:text-red-400 font-semibold text-[10px] hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : isEditing ? (
                      <label className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline font-semibold block py-2 text-xs">
                        Upload Stamp
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setBusinessStampUrl)}
                        />
                      </label>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] py-3">No Stamp Uploaded</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: INVOICES & EXPENSE VOUCHER DEFAULTS */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              {/* Sales Invoices */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Sales Invoice Defaults & Numbering
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Currency Symbol
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg font-bold outline-none ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Invoice Prefix
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg font-mono font-bold outline-none ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Next Invoice Sequence #
                    </label>
                    <input
                      type="number"
                      disabled={!isEditing}
                      value={nextInvoiceSeq}
                      onChange={(e) => setNextInvoiceSeq(parseInt(e.target.value) || 1001)}
                      className={`w-full px-3 py-2 border rounded-lg font-mono font-bold outline-none ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Default Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      disabled={!isEditing}
                      value={defaultTaxRate}
                      onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg font-bold outline-none ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Invoice Footer Terms / Note
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={invoiceFooterNote}
                    onChange={(e) => setInvoiceFooterNote(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                      isEditing
                        ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Expense Voucher Numbering */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Expense Voucher Defaults & Unique Numbering
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Expense Voucher Prefix
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={expensePrefix}
                      onChange={(e) => setExpensePrefix(e.target.value)}
                      placeholder="e.g. EXP-"
                      className={`w-full px-3 py-2 border rounded-lg font-mono font-bold outline-none ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      Voucher pattern: [Prefix][Year]-[Sequence], e.g. {expensePrefix}2026-0001
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      Next Expense Voucher Sequence #
                    </label>
                    <input
                      type="number"
                      disabled={!isEditing}
                      value={nextExpenseSeq}
                      onChange={(e) => setNextExpenseSeq(parseInt(e.target.value) || 1)}
                      className={`w-full px-3 py-2 border rounded-lg font-mono font-bold outline-none ${
                        isEditing
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      Auto-increments upon new expense creation and ensures zero duplicate voucher numbers.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WINDOWS PRINTING */}
          {activeTab === 'printing' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Windows Printing & Paper Configuration
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure default Windows printer labels, paper size, margins, and perform hardware test prints.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTestPageOpen(true)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>PRINT TEST PAGE</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Default Windows Printer Label
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={printSettings.defaultPrinter}
                    onChange={(e) =>
                      setPrintSettings({ ...printSettings, defaultPrinter: e.target.value })
                    }
                    placeholder="e.g. System Default Printer"
                    className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                      isEditing
                        ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Paper Size Standard
                  </label>
                  <select
                    disabled={!isEditing}
                    value={printSettings.paperSize}
                    onChange={(e) =>
                      setPrintSettings({
                        ...printSettings,
                        paperSize: e.target.value as 'A4' | 'Letter' | 'Legal' | 'Thermal',
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                      isEditing
                        ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <option value="A4">A4 (210 x 297 mm) — Default for Invoices & Vouchers</option>
                    <option value="Letter">US Letter (8.5 x 11 in)</option>
                    <option value="Legal">Legal (8.5 x 14 in)</option>
                    <option value="Thermal">Thermal Receipt (80 mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Default Orientation
                  </label>
                  <select
                    disabled={!isEditing}
                    value={printSettings.orientation}
                    onChange={(e) =>
                      setPrintSettings({
                        ...printSettings,
                        orientation: e.target.value as 'portrait' | 'landscape',
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                      isEditing
                        ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Default Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    disabled={!isEditing}
                    value={printSettings.copies}
                    onChange={(e) =>
                      setPrintSettings({
                        ...printSettings,
                        copies: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-lg font-bold outline-none ${
                      isEditing
                        ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Print Margins
                  </label>
                  <select
                    disabled={!isEditing}
                    value={printSettings.margins}
                    onChange={(e) =>
                      setPrintSettings({
                        ...printSettings,
                        margins: e.target.value as 'normal' | 'narrow' | 'none',
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-lg outline-none font-medium ${
                      isEditing
                        ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <option value="normal">Normal (10mm - Recommended)</option>
                    <option value="narrow">Narrow (5mm)</option>
                    <option value="none">None (Borderless)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className={`flex items-center gap-2 select-none font-medium text-slate-700 dark:text-slate-300 ${isEditing ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={printSettings.enablePreview}
                      onChange={(e) =>
                        setPrintSettings({ ...printSettings, enablePreview: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                    />
                    <span>Enable Print Preview Modal before printing</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form Action Buttons */}
          {isEditing && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-300 dark:border-slate-700 uppercase tracking-wider"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Save className="w-4 h-4" /> SAVE CHANGES
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 3: STAFF / EMPLOYEES DATABASE */}
      {activeTab === 'staff' && (
        <StaffSettings
          employees={employees}
          expenses={expenses}
          onSaveEmployee={onSaveEmployee || (() => {})}
          onDeleteEmployee={onDeleteEmployee}
          isEditingDisabled={false}
          passwordHash={passwordHash}
        />
      )}

      {/* Password Verification Modal before editing */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-blue-200 dark:border-blue-900/50 shadow-2xl overflow-hidden p-6 space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handlePasswordVerification} className="space-y-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-blue-200 dark:border-blue-800">
                <Lock className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  VERIFY CURRENT PASSWORD
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Please enter your current software password to edit business details & staff.
                </p>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <X className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Current Software Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="Enter software password..."
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-900 dark:text-slate-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <Unlock className="w-4 h-4" />
                  <span>VERIFY & UNLOCK</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Test Page Modal */}
      <PrintTestPageModal
        isOpen={isTestPageOpen}
        onClose={() => setIsTestPageOpen(false)}
        businessProfile={businessProfile}
      />
    </div>
  );
};
