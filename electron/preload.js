const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  saveFile: (data, defaultName, filters) =>
    ipcRenderer.invoke('save-file', { data: Array.from(new Uint8Array(data)), defaultName, filters }),
  openFiles: (filters, multi) =>
    ipcRenderer.invoke('open-files', { filters, multi }),
  googleSignIn: () => ipcRenderer.invoke('google-signin')
})
