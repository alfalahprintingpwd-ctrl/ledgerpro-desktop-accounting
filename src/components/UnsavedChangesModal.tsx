import React from 'react';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-xs text-slate-800">
        {/* Header */}
        <div className="bg-amber-500 text-slate-950 px-5 py-4 flex items-center justify-between border-b border-amber-600/20">
          <div className="flex items-center gap-2.5 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-slate-950 shrink-0" />
            <span>Unsaved Changes Warning</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-amber-600/20 rounded-lg text-slate-950 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            You have unsaved changes on this form.
          </p>
          <p className="text-slate-600 leading-relaxed">
            What would you like to do before navigating or closing? Closing without saving will discard your entered data.
          </p>
        </div>

        {/* Actions */}
        <div className="bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg shadow-2xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Discard Changes
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
