import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  X,
  Search,
  RotateCcw,
  Edit2,
  Check,
  AlertCircle,
  HelpCircle,
  Lock,
  Receipt,
  LayoutDashboard,
  FileBarChart,
} from 'lucide-react';
import {
  ShortcutDefinition,
  DEFAULT_SHORTCUTS,
  getSavedShortcuts,
  saveShortcutOverrides,
  resetShortcutsToDefault,
  parseComboBadges,
  findShortcutCollision,
} from '../lib/shortcuts';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShortcutsUpdated?: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  onShortcutsUpdated,
}) => {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>(getSavedShortcuts);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordedCombo, setRecordedCombo] = useState<string>('');
  const [collisionError, setCollisionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShortcuts(getSavedShortcuts());
      setEditingId(null);
      setCollisionError(null);
      setRecordedCombo('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Shortcuts' },
    { id: 'general', label: 'General' },
    { id: 'invoices', label: 'Invoices & Entry' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'records', label: 'Records' },
    { id: 'reports', label: 'Reports' },
    { id: 'security', label: 'Security' },
  ];

  const filteredShortcuts = shortcuts.filter((s) => {
    const matchesCategory =
      activeCategory === 'all' || s.category === activeCategory;
    const q = filterQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.label.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.defaultKeyCombo.toLowerCase().includes(q) ||
      (s.customKeyCombo && s.customKeyCombo.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleStartEditing = (s: ShortcutDefinition) => {
    setEditingId(s.id);
    setRecordedCombo(s.customKeyCombo || s.defaultKeyCombo);
    setCollisionError(null);
  };

  const handleKeyDownRecording = (e: React.KeyboardEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore standalone modifier presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    let mainKey = e.key;
    if (mainKey === ' ') mainKey = 'Space';
    if (mainKey === 'Escape') mainKey = 'Esc';
    if (mainKey.length === 1) mainKey = mainKey.toUpperCase();

    parts.push(mainKey);
    const newCombo = parts.join('+');

    // Check collision
    const collision = findShortcutCollision(shortcuts, targetId, newCombo);
    if (collision) {
      setCollisionError(`This shortcut is already assigned to "${collision.label}".`);
      setRecordedCombo(newCombo);
    } else {
      setCollisionError(null);
      setRecordedCombo(newCombo);
    }
  };

  const handleSaveCustomCombo = (targetId: string) => {
    if (collisionError) return;
    if (!recordedCombo) return;

    const updated = shortcuts.map((s) =>
      s.id === targetId ? { ...s, customKeyCombo: recordedCombo } : s
    );

    setShortcuts(updated);

    // Save overrides
    const overrides: Record<string, string> = {};
    updated.forEach((s) => {
      if (s.customKeyCombo && s.customKeyCombo !== s.defaultKeyCombo) {
        overrides[s.id] = s.customKeyCombo;
      }
    });
    saveShortcutOverrides(overrides);

    setEditingId(null);
    setCollisionError(null);
    if (onShortcutsUpdated) onShortcutsUpdated();
  };

  const handleResetDefaults = () => {
    resetShortcutsToDefault();
    setShortcuts(DEFAULT_SHORTCUTS);
    setEditingId(null);
    setCollisionError(null);
    if (onShortcutsUpdated) onShortcutsUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 my-auto text-xs text-slate-800">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-2xs">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base">Keyboard Shortcuts Reference</h2>
              <p className="text-[11px] text-slate-400">
                Accelerate accounting data entry and navigation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search shortcut (e.g., Save, Print, Lock, Alt+D)..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <button
              onClick={handleResetDefaults}
              title="Reset all shortcuts to factory defaults"
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reset Defaults
            </button>
          </div>

          {/* Categories Pill Nav */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition whitespace-nowrap cursor-pointer ${
                  activeCategory === c.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Keyboard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold">No keyboard shortcuts found</p>
              <p className="text-[11px] text-slate-400">
                Try searching for a different action or clear category filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredShortcuts.map((s) => {
                const activeCombo = s.customKeyCombo || s.defaultKeyCombo;
                const badges = parseComboBadges(activeCombo);
                const isEditing = editingId === s.id;

                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs transition flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {s.label}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                          {s.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {s.description}
                      </p>
                    </div>

                    {/* Key combo & edit action */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isEditing ? (
                        <div className="w-full space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={recordedCombo || 'Press key combination...'}
                              onKeyDown={(e) => handleKeyDownRecording(e, s.id)}
                              placeholder="Press key combination..."
                              className="w-full px-2.5 py-1.5 bg-blue-50 border border-blue-400 rounded text-xs font-mono text-blue-900 font-bold outline-none ring-2 ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCustomCombo(s.id)}
                              disabled={!!collisionError}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded transition cursor-pointer"
                              title="Save custom shortcut"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {collisionError && (
                            <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {collisionError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 flex-wrap">
                            {badges.map((b, idx) => (
                              <React.Fragment key={idx}>
                                <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800 shadow-2xs">
                                  {b}
                                </kbd>
                                {idx < badges.length - 1 && (
                                  <span className="text-slate-400 font-mono text-xs">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          {s.isCustomizable && (
                            <button
                              onClick={() => handleStartEditing(s)}
                              title="Customize shortcut"
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-slate-500 text-[11px]">
          <span>
            Tip: Press <kbd className="bg-white px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-slate-800">F1</kbd> anytime to toggle this reference window.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
