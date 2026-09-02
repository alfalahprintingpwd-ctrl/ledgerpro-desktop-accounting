const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC renderer methods to the browser renderer process
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, func) => {
    const subscription = (event, ...args) => func(event, ...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  once: (channel, func) => {
    ipcRenderer.once(channel, (event, ...args) => func(event, ...args));
  },
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data);
  },
  removeListener: (channel, func) => {
    ipcRenderer.removeListener(channel, func);
  },
});

contextBridge.exposeInMainWorld('electronAPI', {
  print: (options) => ipcRenderer.invoke('print-document', options),
  printInvoice: (invoiceId) => ipcRenderer.send('print-invoice', { invoiceId }),
});
