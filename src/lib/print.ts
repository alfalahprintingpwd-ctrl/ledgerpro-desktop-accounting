export interface PrintSettings {
  defaultPrinter: string;
  paperSize: 'A4' | 'Letter' | 'Legal' | 'Thermal';
  orientation: 'portrait' | 'landscape';
  copies: number;
  margins: 'normal' | 'narrow' | 'none';
  enablePreview: boolean;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  defaultPrinter: 'Windows Default Printer',
  paperSize: 'A4',
  orientation: 'portrait',
  copies: 1,
  margins: 'normal',
  enablePreview: true,
};

const PRINT_SETTINGS_KEY = 'ledgerpro_print_settings_v1';

export function getPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(PRINT_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed to parse print settings:', err);
  }
  return DEFAULT_PRINT_SETTINGS;
}

export function savePrintSettings(settings: PrintSettings): void {
  try {
    localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save print settings:', err);
  }
}

/**
 * Triggers the browser/system native print dialog.
 * Performs environment readiness checks and handles errors gracefully.
 */
export function triggerPrintDocument(options?: {
  title?: string;
  onError?: (msg: string) => void;
}): boolean {
  if (typeof window === 'undefined' || typeof window.print !== 'function') {
    if (options?.onError) {
      options.onError('No printer access was detected in this browser environment.');
    }
    return false;
  }

  try {
    // Dynamically apply page settings if title provided
    if (options?.title) {
      const origTitle = document.title;
      document.title = options.title;
      setTimeout(() => {
        document.title = origTitle;
      }, 2000);
    }

    window.print();
    return true;
  } catch (err: any) {
    console.error('Print Error:', err);
    const msg =
      err?.message ||
      'Unable to connect to the selected printer. Please ensure a printer is installed and online in Windows.';
    if (options?.onError) {
      options.onError(msg);
    }
    return false;
  }
}
