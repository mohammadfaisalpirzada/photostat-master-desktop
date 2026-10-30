const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: 'Photostat Master',
    backgroundColor: '#B4241C',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const startUrl = process.env.ELECTRON_START_URL
  if (startUrl) {
    win.loadURL(startUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
  win.setMenuBarVisibility(false)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// --- File save (renderer sends bytes; main shows Save dialog + writes) ---
ipcMain.handle('save-file', async (_e, { data, defaultName, filters }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  })
  if (canceled || !filePath) return { ok: false }
  fs.writeFileSync(filePath, Buffer.from(data))
  return { ok: true, path: filePath }
})

// --- Open file(s): returns {name, bytes} list ---
ipcMain.handle('open-files', async (_e, { filters, multi }) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: multi ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  })
  if (canceled) return []
  return filePaths.map(p => ({ name: path.basename(p), bytes: fs.readFileSync(p) }))
})
