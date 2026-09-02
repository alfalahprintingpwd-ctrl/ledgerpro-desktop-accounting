const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'LedgerPro - Enterprise Billing & Financial Management System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------------------------------------------------------------
// IPC Handlers for Windows Native Printing (No Custom Print Settings UI)
// ----------------------------------------------------------------------

/**
 * Handle 'print-invoice' IPC event from InvoiceModal.
 * Directly invokes webContents.print with silent: false to ensure the real
 * Windows native printer selection and printer driver preferences dialog opens.
 */
ipcMain.on('print-invoice', (event, data) => {
  const targetWindow =
    BrowserWindow.fromWebContents(event.sender) ||
    BrowserWindow.getFocusedWindow() ||
    mainWindow;

  if (!targetWindow || !targetWindow.webContents) {
    console.error('[Electron Main] Target window webContents not available for print-invoice.');
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('print-invoice-reply', {
        success: false,
        failureReason: 'Target window not available',
        invoiceId: data?.invoiceId,
      });
    }
    return;
  }

  console.log(`[Electron Main] Opening native print dialog for invoiceId: ${data?.invoiceId}`);

  // Pure native Windows / system print dialog invocation:
  // - silent: false (guarantees the native system print dialog opens)
  // - printBackground: true
  // - NO deviceName (allows user to select any printer and configure driver preferences)
  targetWindow.webContents.print(
    {
      silent: false,
      printBackground: true,
    },
    (success, failureReason) => {
      console.log(
        `[Electron Main] print-invoice result - success: ${success}, reason: ${failureReason || 'OK'}`
      );

      const isCancelled =
        !success &&
        (failureReason?.toLowerCase().includes('cancel') ||
          failureReason?.toLowerCase().includes('abort') ||
          failureReason === '' ||
          !failureReason);

      if (!event.sender.isDestroyed()) {
        event.sender.send('print-invoice-reply', {
          success: Boolean(success),
          cancelled: isCancelled,
          failureReason: isCancelled ? null : failureReason,
          invoiceId: data?.invoiceId,
        });
      }
    }
  );
});

/**
 * Handle 'print-document' asynchronous IPC invoke call
 */
ipcMain.handle('print-document', async (event, options = {}) => {
  const targetWindow =
    BrowserWindow.fromWebContents(event.sender) ||
    BrowserWindow.getFocusedWindow() ||
    mainWindow;

  if (!targetWindow || !targetWindow.webContents) {
    return { success: false, error: 'Target window not available' };
  }

  return new Promise((resolve) => {
    targetWindow.webContents.print(
      {
        silent: false, // Guarantees native Windows dialog opens
        printBackground: options.printBackground !== false,
        landscape: Boolean(options.landscape),
        color: options.color !== false,
        margins: {
          marginType: 'printableArea',
        },
      },
      (success, failureReason) => {
        const isCancelled =
          !success &&
          (failureReason?.toLowerCase().includes('cancel') ||
            failureReason?.toLowerCase().includes('abort') ||
            !failureReason);

        resolve({
          success,
          cancelled: isCancelled,
          failureReason: isCancelled ? null : failureReason,
        });
      }
    );
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
