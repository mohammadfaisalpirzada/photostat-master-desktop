const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const crypto = require('crypto')

// Desktop ("installed app") OAuth client.
// The secret is injected at build time (CI writes electron/google-config.js from
// a GitHub Actions secret); it is never committed to the repo.
let GOOGLE_CLIENT_ID = '900136320125-3t5upmp3hgrkiq737n5r49g895ee6rdu.apps.googleusercontent.com'
let GOOGLE_CLIENT_SECRET = ''
try {
  const cfg = require('./google-config')
  if (cfg.clientId) GOOGLE_CLIENT_ID = cfg.clientId
  if (cfg.clientSecret) GOOGLE_CLIENT_SECRET = cfg.clientSecret
} catch {}
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

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

// --- Google Sign-In (system browser + loopback, PKCE) → returns id_token ---
ipcMain.handle('google-signin', async () => {
  return await new Promise((resolve, reject) => {
    const state = b64url(crypto.randomBytes(16))
    const verifier = b64url(crypto.randomBytes(32))
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
    let redirectUri = ''
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost')
        const code = url.searchParams.get('code')
        const err = url.searchParams.get('error')
        if (!code && !err) { res.statusCode = 404; res.end(); return }
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end('<html><body style="font-family:Segoe UI,sans-serif;text-align:center;padding:48px"><h2 style="color:#B4241C">Photostat Master</h2><p>Sign-in complete. You can close this window and return to the app.</p></body></html>')
        try { server.close() } catch {}
        if (err) return reject(new Error(err))
        if (url.searchParams.get('state') !== state) return reject(new Error('state mismatch'))
        const body = new URLSearchParams({
          code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier
        })
        const resp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
        })
        const json = await resp.json()
        if (json.id_token) resolve(json.id_token)
        else reject(new Error(json.error_description || json.error || 'token exchange failed'))
      } catch (e) { try { server.close() } catch {} ; reject(e) }
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      redirectUri = `http://localhost:${port}`
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code',
        scope: 'openid email profile', state, code_challenge: challenge,
        code_challenge_method: 'S256', prompt: 'select_account'
      }).toString()
      shell.openExternal(authUrl)
    })
    setTimeout(() => { try { server.close() } catch {} ; reject(new Error('timed out')) }, 180000)
  })
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
