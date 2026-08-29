import React, { useState } from 'react';
import { Employee, SecurityAuditLog } from '../types';
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
  Check,
} from 'lucide-react';
import { createSecurityLog } from '../lib/security';

interface StaffSettingsProps {
  employees: Employee[];
  onSaveEmployee: (employee: Employee, auditLog?: SecurityAuditLog) => void;
  onDeleteEmployee?: (id: string, auditLog?: SecurityAuditLog) => void;
  isEditingDisabled?: boolean;
}

export const StaffSettings: React.FC<StaffSettingsProps> = ({
  employees,
  onSaveEmployee,
  onDeleteEmployee,
  isEditingDisabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openNewModal = () => {
    setEditingEmployee(null);
    setName('');
    setContactNumber('');
    setDesignation('');
    setSignatureUrl('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setContactNumber(emp.contactNumber || '');
    setDesignation(emp.designation || '');
    setSignatureUrl(emp.signatureUrl || '');
    setStatus(emp.status);
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/i)) {
      alert('Supported signature formats: PNG, JPG, JPEG, and transparent WEBP images.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Signature image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter employee name');
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
    setIsModalOpen(false);
    setToast({
      type: 'success',
      message: isNew
        ? `Employee "${employeeToSave.name}" added successfully.`
        : `Employee "${employeeToSave.name}" updated successfully.`,
    });
  };

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
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-white hover:opacity-80">
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
            Manage employees who handle business expenses and configure digital signatures for vouchers.
          </p>
        </div>

        <button
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
            No employees or staff members added yet. Click "+ Add New Employee" to register staff.
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
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
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
                        onClick={() => handleToggleStatus(emp)}
                        disabled={isEditingDisabled}
                        title={`Click to mark ${emp.status === 'active' ? 'Inactive' : 'Active'}`}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition inline-flex items-center gap-1 ${
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
                          onClick={() => openEditModal(emp)}
                          disabled={isEditingDisabled}
                          title="Edit Staff Member"
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteEmployee && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to remove employee "${emp.name}"? Note: Deactivating the employee instead is recommended to preserve historical vouchers.`
                                )
                              ) {
                                const log = createSecurityLog(
                                  'business_profile_updated',
                                  `Removed employee ${emp.name}`
                                );
                                onDeleteEmployee(emp.id, log);
                              }
                            }}
                            disabled={isEditingDisabled}
                            title="Delete Staff Member"
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                {editingEmployee ? 'Edit Employee / Staff Member' : 'Add New Employee / Staff'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  Employee / Staff Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Muhammad Ali"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    Designation / Role
                  </label>
                  <input
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
                          className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline"
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingEmployee ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
