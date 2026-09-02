import React, { useState } from 'react';
import { Employee, SecurityAuditLog, Expense } from '../types';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Upload,
  UserCheck,
  UserX,
  X,
  Phone,
  Briefcase,
  Image as ImageIcon,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { createSecurityLog } from '../lib/security';
import { verifyPassword } from '../lib/crypto';
import { compressImage } from '../lib/imageUtils';

interface StaffSettingsProps {
  employees: Employee[];
  expenses?: Expense[];
  onSaveEmployee: (employee: Employee, auditLog?: SecurityAuditLog) => void;
  onDeleteEmployee?: (id: string, auditLog?: SecurityAuditLog) => void;
  isEditingDisabled?: boolean;
  passwordHash?: string;
}

export const StaffSettings: React.FC<StaffSettingsProps> = ({
  employees,
  expenses = [],
  onSaveEmployee,
  onDeleteEmployee,
  isEditingDisabled = false,
  passwordHash = '',
}) => {
  // Modal states for Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState('');

  // Delete Confirmation Modal State
  const [deletingStaff, setDeletingStaff] = useState<Employee | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Notification Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Open Add Modal
  const openNewModal = () => {
    setEditingEmployee(null);
    setName('');
    setContactNumber('');
    setDesignation('');
    setSignatureUrl('');
    setStatus('active');
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setContactNumber(emp.contactNumber || '');
    setDesignation(emp.designation || '');
    setSignatureUrl(emp.signatureUrl || '');
    setStatus(emp.status);
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (emp: Employee) => {
    setDeletingStaff(emp);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  // Cancel Delete
  const handleCancelDelete = () => {
    setDeletingStaff(null);
    setDeletePassword('');
    setDeleteError('');
    setShowDeletePassword(false);
  };

  // Confirm Delete Action
  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingStaff) return;

    // Master Software Password Verification
    if (passwordHash) {
      if (!deletePassword) {
        setDeleteError('Please enter your software password to authorize deletion.');
        return;
      }

      const isValid = verifyPassword(deletePassword, passwordHash);
      if (!isValid) {
        setDeleteError('Incorrect password. Please try again.');
        return;
      }
    }

    try {
      const staffToDelete = deletingStaff;
      const staffId = staffToDelete.id;
      const staffName = staffToDelete.name;

      if (onDeleteEmployee) {
        const auditLog = createSecurityLog(
          'business_profile_updated',
          `Deleted staff member: ${staffName} (${staffToDelete.designation || 'Staff'}, ID: ${staffId})`
        );
        onDeleteEmployee(staffId, auditLog);
      }

      // Close modal and reset state
      setDeletingStaff(null);
      setDeletePassword('');
      setDeleteError('');
      setShowDeletePassword(false);

      // Show Success Toast
      setToast({
        type: 'success',
        message: 'Staff member deleted successfully.',
      });
    } catch (err) {
      console.error('Failed to delete staff member:', err);
      setDeleteError('Unable to delete staff member. Please try again.');
    }
  };

  // File upload for signature image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/i)) {
      setFormError('Supported signature formats: PNG, JPG, JPEG, and transparent WEBP images.');
      return;
    }

    setFormError('');
    try {
      const compressed = await compressImage(file, {
        maxWidth: 350,
        maxHeight: 140,
        quality: 0.85,
        format: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      });
      setSignatureUrl(compressed);
    } catch (err) {
      console.error('Signature compression failed, using fallback', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submit for Add / Edit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter employee name.');
      return;
    }

    const employeeToSave: Employee = {
      id: editingEmployee?.id || `emp_${Date.now()}`,
      name: name.trim(),
      contactNumber: contactNumber.trim(),
      designation: designation.trim(),
      signatureUrl: signatureUrl.trim(),
      status,
      createdAt: editingEmployee?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const isNew = !editingEmployee;
    const auditLog = createSecurityLog(
      'business_profile_updated',
      `${isNew ? 'Added new employee' : 'Updated employee record'}: ${employeeToSave.name} (${employeeToSave.designation || 'Staff'}, Status: ${employeeToSave.status})`
    );

    onSaveEmployee(employeeToSave, auditLog);
    setIsFormModalOpen(false);
    setToast({
      type: 'success',
      message: isNew
        ? `Employee "${employeeToSave.name}" added successfully.`
        : `Employee "${employeeToSave.name}" updated successfully.`,
    });
  };

  // Toggle Status active / inactive
  const handleToggleStatus = (emp: Employee) => {
    const newStatus: 'active' | 'inactive' = emp.status === 'active' ? 'inactive' : 'active';
    const updated: Employee = {
      ...emp,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    const auditLog = createSecurityLog(
      'business_profile_updated',
      `Changed employee status for ${emp.name} to ${newStatus}`
    );
    onSaveEmployee(updated, auditLog);
    setToast({
      type: 'success',
      message: `Employee "${emp.name}" is now marked as ${newStatus}.`,
    });
  };

  return (
    <div id="staff-settings-container" className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          id="staff-toast"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition shadow-md animate-fade-in ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white hover:opacity-80 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Staff & Responsible Persons Database
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authorized staff members for business expenses and digital signature voucher generation.
          </p>
        </div>

        <button
          id="btn-add-staff-member"
          type="button"
          onClick={openNewModal}
          disabled={isEditingDisabled}
          className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
            isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Plus className="w-4 h-4" /> + ADD NEW EMPLOYEE / STAFF
        </button>
      </div>

      {/* Employees Grid / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {employees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            No employees or staff members registered yet. Click &quot;+ Add New Employee&quot; to add a staff member.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 dark:bg-slate-950 text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee / Staff Name</th>
                  <th className="py-3 px-4">Designation / Role</th>
                  <th className="py-3 px-4">Contact Number</th>
                  <th className="py-3 px-4 text-center">Voucher Signature</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    id={`staff-row-${emp.id}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <span>{emp.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                            ID: {emp.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {emp.designation ? (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {emp.designation}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      {emp.contactNumber ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {emp.contactNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {emp.signatureUrl ? (
                        <div className="inline-block p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                          <img
                            src={emp.signatureUrl}
                            alt={`${emp.name} Signature`}
                            className="max-h-8 max-w-[100px] object-contain mx-auto bg-white p-0.5 rounded"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-medium">
                          No Digital Sign (Manual)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        id={`btn-toggle-status-${emp.id}`}
                        onClick={() => handleToggleStatus(emp)}
                        disabled={isEditingDisabled}
                        title={`Click to mark ${emp.status === 'active' ? 'Inactive' : 'Active'}`}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition inline-flex items-center gap-1 cursor-pointer ${
                          emp.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {emp.status === 'active' ? (
                          <>
                            <UserCheck className="w-3 h-3" /> ACTIVE
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" /> INACTIVE
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          id={`btn-edit-staff-${emp.id}`}
                          onClick={() => openEditModal(emp)}
                          disabled={isEditingDisabled}
                          title="Edit Staff Member"
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id={`btn-delete-staff-${emp.id}`}
                          onClick={() => openDeleteModal(emp)}
                          disabled={isEditingDisabled}
                          title="Delete Staff Member"
                          className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer border border-rose-100 dark:border-rose-900/50 hover:border-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {isFormModalOpen && (
        <div
          id="modal-staff-form"
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                {editingEmployee ? 'Edit Employee / Staff Member' : 'Add New Employee / Staff'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Employee / Staff Name *
                </label>
                <input
                  id="input-staff-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Muhammad Ali"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormError('');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Designation / Role
                  </label>
                  <input
                    id="input-staff-designation"
                    type="text"
                    placeholder="e.g. Accountant"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="input-staff-phone"
                    type="text"
                    placeholder="e.g. +92 300 1234567"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Employment Status
                </label>
                <select
                  id="select-staff-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-bold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="active">Active (Available for Expense Entry)</option>
                  <option value="inactive">Inactive / Deactivated</option>
                </select>
              </div>

              {/* Signature Upload Area */}
              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Employee Signature (Optional - Transparent PNG/JPG)
                </label>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 text-center space-y-3">
                  {signatureUrl ? (
                    <div className="space-y-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-700 inline-block shadow-2xs">
                        <img
                          src={signatureUrl}
                          alt="Signature Preview"
                          className="max-h-16 max-w-[200px] object-contain mx-auto"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => setSignatureUrl('')}
                          className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                        >
                          Remove Signature
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 dark:text-slate-500">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                      <p className="text-[11px]">No signature uploaded. Manual sign line will be used on vouchers.</p>
                    </div>
                  )}

                  <label className="inline-block px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition shadow-2xs">
                    <Upload className="w-3 h-3 inline mr-1" />
                    {signatureUrl ? 'Replace Signature' : 'Upload Signature Image'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Recommended: Transparent PNG image with clear dark signature
                  </p>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  id="btn-cancel-staff-form"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-staff-form"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingEmployee ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Working Delete Confirmation Modal */}
      {deletingStaff && (
        <div
          id="modal-delete-staff-confirmation"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-rose-200 dark:border-rose-900/60 shadow-2xl overflow-hidden relative">
            {/* Modal Header */}
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-100 shrink-0" />
                <span>Delete Staff Member</span>
              </div>
              <button
                type="button"
                id="btn-close-delete-staff-modal"
                onClick={handleCancelDelete}
                className="text-rose-100 hover:text-white p-1 rounded-lg hover:bg-rose-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="p-6 space-y-4">
              {/* Question / Prompt */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Are you sure you want to delete this staff member?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This action will permanently remove this staff record from the active Staff Database.
                </p>
              </div>

              {/* Selected Staff Details Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Employee Name:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{deletingStaff.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Designation / Role:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {deletingStaff.designation || 'Staff Member'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Contact Phone:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {deletingStaff.contactNumber || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Database ID:</span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold">{deletingStaff.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Current Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      deletingStaff.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {deletingStaff.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Accounting Data Protection Notice */}
              {(() => {
                const linkedCount = (expenses || []).filter(
                  (exp) =>
                    exp.employeeId === deletingStaff.id ||
                    (exp.madeBy && exp.madeBy.trim().toLowerCase() === deletingStaff.name.trim().toLowerCase())
                ).length;

                return (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-1.5 text-[11px] text-blue-800 dark:text-blue-300">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <span>
                        <strong>Accounting & Historical Audit Integrity:</strong> Deleting this staff member will remove them from the active Staff Database.
                      </span>
                    </div>
                    {linkedCount > 0 && (
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 pl-6 font-medium">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {linkedCount} historical expense voucher(s) linked to this staff member will safely retain their recorded name.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Password Authorization Field */}
              {passwordHash ? (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Enter Software Password to
                    Authorize Deletion
                  </label>
                  <div className="relative">
                    <input
                      id="input-delete-staff-password"
                      type={showDeletePassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value);
                        setDeleteError('');
                      }}
                      placeholder="Enter software password..."
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-sm font-medium text-slate-900 dark:text-slate-100 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
                      title={showDeletePassword ? 'Hide password' : 'Show password'}
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Error Message */}
              {deleteError && (
                <div
                  id="staff-delete-error"
                  className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Action Buttons: CANCEL / DELETE STAFF */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  id="btn-cancel-delete-staff"
                  onClick={handleCancelDelete}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-300 dark:border-slate-700 uppercase tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  id="btn-confirm-delete-staff"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Trash2 className="w-4 h-4" /> DELETE STAFF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
