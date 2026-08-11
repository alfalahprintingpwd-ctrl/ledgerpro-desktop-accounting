export interface ShortcutDefinition {
  id: string;
  category: 'general' | 'invoices' | 'navigation' | 'records' | 'reports' | 'security';
  label: string;
  description: string;
  defaultKeyCombo: string; // e.g. "Ctrl+S", "Alt+D", "F1", "Esc"
  customKeyCombo?: string; // If user customized it
  isCustomizable: boolean;
}

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // General
  {
    id: 'help_modal',
    category: 'general',
    label: 'Keyboard Shortcuts Help',
    description: 'Open keyboard shortcuts guide',
    defaultKeyCombo: 'F1',
    isCustomizable: true,
  },
  {
    id: 'close_modal',
    category: 'general',
    label: 'Close / Cancel',
    description: 'Close active modal, popup, or clear search',
    defaultKeyCombo: 'Escape',
    isCustomizable: false,
  },
  {
    id: 'save_form',
    category: 'general',
    label: 'Save Current Form',
    description: 'Save active entry, invoice, or settings form',
    defaultKeyCombo: 'Ctrl+S',
    isCustomizable: true,
  },
  {
    id: 'focus_search',
    category: 'general',
    label: 'Search Records',
    description: 'Focus main search bar to query transactions or customers',
    defaultKeyCombo: 'Ctrl+F',
    isCustomizable: true,
  },

  // Invoices & Entry
  {
    id: 'new_entry',
    category: 'invoices',
    label: 'Create New Sale Entry',
    description: 'Open New Sale & Invoice dialog',
    defaultKeyCombo: 'Ctrl+N',
    isCustomizable: true,
  },
  {
    id: 'new_invoice',
    category: 'invoices',
    label: 'New Invoice',
    description: 'Alternative shortcut for new invoice creation',
    defaultKeyCombo: 'Ctrl+I',
    isCustomizable: true,
  },
  {
    id: 'print_doc',
    category: 'invoices',
    label: 'Print Document',
    description: 'Trigger Windows print dialog for active document',
    defaultKeyCombo: 'Ctrl+P',
    isCustomizable: true,
  },
  {
    id: 'print_preview',
    category: 'invoices',
    label: 'Print Preview',
    description: 'Open full print preview for current invoice/report',
    defaultKeyCombo: 'Ctrl+Shift+P',
    isCustomizable: true,
  },
  {
    id: 'save_pdf',
    category: 'invoices',
    label: 'Save as PDF',
    description: 'Export active invoice/report/statement to PDF file',
    defaultKeyCombo: 'Ctrl+Shift+S',
    isCustomizable: true,
  },

  // Navigation (Alt + Key)
  {
    id: 'nav_dashboard',
    category: 'navigation',
    label: 'Go to Dashboard',
    description: 'Switch main view to Dashboard',
    defaultKeyCombo: 'Alt+D',
    isCustomizable: true,
  },
  {
    id: 'nav_sales',
    category: 'navigation',
    label: 'Go to Sales / Invoices',
    description: 'Switch main view to Sales Entries',
    defaultKeyCombo: 'Alt+I',
    isCustomizable: true,
  },
  {
    id: 'nav_new_entry',
    category: 'navigation',
    label: 'Go to New Entry',
    description: 'Switch view or open New Sales entry',
    defaultKeyCombo: 'Alt+N',
    isCustomizable: true,
  },
  {
    id: 'nav_customers',
    category: 'navigation',
    label: 'Go to Customers',
    description: 'Switch main view to Customer Directory',
    defaultKeyCombo: 'Alt+C',
    isCustomizable: true,
  },
  {
    id: 'nav_expenses',
    category: 'navigation',
    label: 'Go to Expenses',
    description: 'Switch main view to Expenses Manager',
    defaultKeyCombo: 'Alt+E',
    isCustomizable: true,
  },
  {
    id: 'nav_reports',
    category: 'navigation',
    label: 'Go to Daily Reports',
    description: 'Switch main view to Daily Financial Report',
    defaultKeyCombo: 'Alt+R',
    isCustomizable: true,
  },
  {
    id: 'nav_settings',
    category: 'navigation',
    label: 'Go to Settings',
    description: 'Switch main view to Business Settings',
    defaultKeyCombo: 'Alt+S',
    isCustomizable: true,
  },
  {
    id: 'nav_backup',
    category: 'navigation',
    label: 'Go to Backup & Restore',
    description: 'Switch main view to Database Backup & Restore',
    defaultKeyCombo: 'Alt+B',
    isCustomizable: true,
  },

  // Record Navigation
  {
    id: 'prev_record',
    category: 'records',
    label: 'Previous Record',
    description: 'Navigate to previous invoice or customer in preview',
    defaultKeyCombo: 'ArrowLeft',
    isCustomizable: true,
  },
  {
    id: 'next_record',
    category: 'records',
    label: 'Next Record',
    description: 'Navigate to next invoice or customer in preview',
    defaultKeyCombo: 'ArrowRight',
    isCustomizable: true,
  },

  // Reports
  {
    id: 'daily_prev_day',
    category: 'reports',
    label: 'Daily Report: Previous Day',
    description: 'Navigate to previous date in Daily Report',
    defaultKeyCombo: 'Ctrl+ArrowLeft',
    isCustomizable: true,
  },
  {
    id: 'daily_next_day',
    category: 'reports',
    label: 'Daily Report: Next Day',
    description: 'Navigate to next date in Daily Report',
    defaultKeyCombo: 'Ctrl+ArrowRight',
    isCustomizable: true,
  },
  {
    id: 'daily_today',
    category: 'reports',
    label: 'Daily Report: Go to Today',
    description: 'Jump selected date to today in Daily Report',
    defaultKeyCombo: 'Ctrl+T',
    isCustomizable: true,
  },
  {
    id: 'monthly_prev_month',
    category: 'reports',
    label: 'Monthly Report: Previous Month',
    description: 'Navigate to previous month in Monthly Reports',
    defaultKeyCombo: 'Ctrl+Shift+ArrowLeft',
    isCustomizable: true,
  },
  {
    id: 'monthly_next_month',
    category: 'reports',
    label: 'Monthly Report: Next Month',
    description: 'Navigate to next month in Monthly Reports',
    defaultKeyCombo: 'Ctrl+Shift+ArrowRight',
    isCustomizable: true,
  },
  {
    id: 'yearly_prev_year',
    category: 'reports',
    label: 'Yearly Report: Previous Year',
    description: 'Navigate to previous year in Yearly Report',
    defaultKeyCombo: 'Ctrl+Shift+ArrowUp',
    isCustomizable: true,
  },
  {
    id: 'yearly_next_year',
    category: 'reports',
    label: 'Yearly Report: Next Year',
    description: 'Navigate to next year in Yearly Report',
    defaultKeyCombo: 'Ctrl+Shift+ArrowDown',
    isCustomizable: true,
  },

  // Security
  {
    id: 'lock_software',
    category: 'security',
    label: 'Lock Software',
    description: 'Secure application and show password login screen',
    defaultKeyCombo: 'Ctrl+L',
    isCustomizable: true,
  },
  {
    id: 'logout_session',
    category: 'security',
    label: 'Logout Session',
    description: 'Safely logout and lock user session',
    defaultKeyCombo: 'Ctrl+Shift+L',
    isCustomizable: true,
  },
];

const STORAGE_KEY = 'ledgerpro_custom_shortcuts_v1';

export function getSavedShortcuts(): ShortcutDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return DEFAULT_SHORTCUTS.map((s) => ({
      ...s,
      customKeyCombo: parsed[s.id] || s.defaultKeyCombo,
    }));
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcutOverrides(overrides: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.error('Failed to save keyboard shortcuts config:', err);
  }
}

export function resetShortcutsToDefault(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset shortcuts:', err);
  }
}

/** Check if active element is a text input, textarea, or contentEditable element */
export function isInputField(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }
  return false;
}

/** Check if event matches a shortcut key combination */
export function matchKeyCombo(
  event: KeyboardEvent,
  combo: string
): boolean {
  const parts = combo.split('+').map((p) => p.trim());
  const hasCtrl = parts.includes('Ctrl') || parts.includes('Control');
  const hasShift = parts.includes('Shift');
  const hasAlt = parts.includes('Alt');
  const keyPart = parts.find(
    (p) => !['Ctrl', 'Control', 'Shift', 'Alt'].includes(p)
  );

  if (hasCtrl && !(event.ctrlKey || event.metaKey)) return false;
  if (!hasCtrl && (event.ctrlKey || event.metaKey)) return false;

  if (hasShift && !event.shiftKey) return false;
  if (!hasShift && event.shiftKey) return false;

  if (hasAlt && !event.altKey) return false;
  if (!hasAlt && event.altKey) return false;

  if (!keyPart) return false;

  const eventKey = event.key;

  // Normalize Key Names
  if (keyPart.toLowerCase() === 'escape' || keyPart.toLowerCase() === 'esc') {
    return eventKey === 'Escape';
  }
  if (keyPart.startsWith('Arrow')) {
    return eventKey === keyPart;
  }
  if (keyPart.startsWith('F') && keyPart.length <= 3) {
    return eventKey.toUpperCase() === keyPart.toUpperCase();
  }

  return eventKey.toLowerCase() === keyPart.toLowerCase();
}

/** Format combo for display badges, e.g. "Ctrl+Shift+S" -> ["Ctrl", "Shift", "S"] */
export function parseComboBadges(combo: string): string[] {
  return combo.split('+').map((p) => p.trim());
}

/** Detect duplicate shortcut assignments */
export function findShortcutCollision(
  shortcuts: ShortcutDefinition[],
  targetId: string,
  newCombo: string
): ShortcutDefinition | null {
  const normalizedNew = newCombo.toLowerCase().replace(/\s+/g, '');
  return (
    shortcuts.find((s) => {
      if (s.id === targetId) return false;
      const activeCombo = (s.customKeyCombo || s.defaultKeyCombo)
        .toLowerCase()
        .replace(/\s+/g, '');
      return activeCombo === normalizedNew;
    }) || null
  );
}
