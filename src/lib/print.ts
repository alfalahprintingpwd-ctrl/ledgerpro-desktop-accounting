import { sanitizeFilename } from './pdf';

export interface NativePrintOptions {
  title?: string;
  landscape?: boolean;
  printBackground?: boolean;
  onError?: (error: string) => void;
}

export interface NativePrintResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
}

export interface PrintSettings {
  defaultPrinter: string;
  paperSize: 'A4' | 'Letter' | 'Legal' | 'Thermal';
  orientation: 'portrait' | 'landscape';
  copies: number;
  margins: 'normal' | 'narrow' | 'none';
  colorMode: 'color' | 'grayscale' | 'monochrome';
  duplex: 'simplex' | 'duplexLongEdge' | 'duplexShortEdge';
  enablePreview: boolean;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  defaultPrinter: 'Windows Default Printer',
  paperSize: 'A4',
  orientation: 'portrait',
  copies: 1,
  margins: 'normal',
  colorMode: 'color',
  duplex: 'simplex',
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
 * Invokes the real Windows native print dialog (via Electron IPC / webContents.print with silent: false,
 * or standard native system print dialog via window.print()).
 * 
 * This directly opens the OS/Windows printer selection dialog where the user can:
 * - See all installed Windows printers (HP, Epson, Canon, Brother, Microsoft Print to PDF, etc.)
 * - Open the actual manufacturer printer driver's "Preferences" / "Properties" dialog
 * - Configure paper size (A4), tray, quality, duplex, color, etc.
 * - Confirm or Cancel printing natively without any custom app-generated settings UI.
 */
export async function triggerNativeWindowsPrint(options?: NativePrintOptions): Promise<NativePrintResult> {
  const {
    title = 'Document',
    landscape = false,
    printBackground = true,
    onError,
  } = options || {};

  try {
    const win = typeof window !== 'undefined' ? (window as any) : null;

    // 1. Electron Main Process Bridge (via preload electronAPI or ipcRenderer)
    if (win?.electronAPI?.print && typeof win.electronAPI.print === 'function') {
      try {
        const res = await win.electronAPI.print({
          silent: false, // Ensures native Windows printer selection & driver preferences dialog opens
          printBackground,
          landscape,
        });

        if (res && typeof res === 'object') {
          if (res.canceled || res.cancelled) {
            return { success: false, cancelled: true };
          }
          if (res.failureReason || res.error) {
            const err = res.failureReason || res.error;
            if (onError) onError(err);
            return { success: false, error: err };
          }
        }
        return { success: true, cancelled: false };
      } catch (err: any) {
        if (
          err?.message?.includes('cancelled') ||
          err?.message?.includes('canceled') ||
          err?.name === 'AbortError'
        ) {
          return { success: false, cancelled: true };
        }
        const errorMsg = err?.message || 'Print error';
        if (onError) onError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    if (win?.ipcRenderer?.invoke && typeof win.ipcRenderer.invoke === 'function') {
      try {
        const res = await win.ipcRenderer.invoke('print-document', {
          silent: false, // Ensures native Windows printer selection & driver preferences dialog opens
          printBackground,
          landscape,
        });

        if (res && typeof res === 'object') {
          if (res.canceled || res.cancelled) {
            return { success: false, cancelled: true };
          }
          if (res.failureReason || res.error) {
            const err = res.failureReason || res.error;
            if (onError) onError(err);
            return { success: false, error: err };
          }
        }
        return { success: true, cancelled: false };
      } catch (err: any) {
        if (
          err?.message?.includes('cancelled') ||
          err?.message?.includes('canceled') ||
          err?.name === 'AbortError'
        ) {
          return { success: false, cancelled: true };
        }
        const errorMsg = err?.message || 'Print error';
        if (onError) onError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    // 2. Browser & Windows Webview Native System Print Dialog
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      const origTitle = document.title;
      if (title) {
        document.title = sanitizeFilename(title);
      }

      window.print();

      if (title) {
        setTimeout(() => {
          document.title = origTitle;
        }, 1500);
      }
      return { success: true, cancelled: false };
    }

    const msg = 'Native Windows printing is not supported in this environment.';
    if (onError) onError(msg);
    return { success: false, error: msg };
  } catch (error: any) {
    console.error('Error invoking native Windows print dialog:', error);
    const msg = error?.message || 'Unable to open Windows printer dialog.';
    if (onError) onError(msg);
    return { success: false, error: msg };
  }
}

// Alias for backward compatibility
export const triggerPrintDocument = triggerNativeWindowsPrint;
