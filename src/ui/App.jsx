import React, { useEffect, useState } from 'react'
import { auth } from '../firebase.js'
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, signInWithPopup, GoogleAuthProvider
} from 'firebase/auth'
import { loadPdf, renderPageToCanvas, pageToBytes } from '../lib/pdfRender.js'
import { mergePdfs, splitPdf, imagesToPdf } from '../lib/convert.js'
import { ocrImage } from '../lib/ocr.js'

const PDF_FILTER = [{ name: 'PDF', extensions: ['pdf'] }]
const IMG_FILTER = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]

function u8 (b) { return b instanceof Uint8Array ? b : new Uint8Array(b) }

export default function App () {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setReady(true) }), [])

  if (!ready) return <Center><div className="spinner" /></Center>
  if (!user) return <Login />
  return <Main user={user} />
}

function Center ({ children }) {
  return <div className="center">{children}</div>
}

function Login () {
  const [signup, setSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async () => {
    if (!email || pw.length < 6) { setErr('Enter a valid email and 6+ char password.'); return }
    setBusy(true); setErr(null)
    try {
      if (signup) await createUserWithEmailAndPassword(auth, email.trim(), pw)
      else await signInWithEmailAndPassword(auth, email.trim(), pw)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const google = async () => {
    setBusy(true); setErr(null)
    try { await signInWithPopup(auth, new GoogleAuthProvider()) }
    catch (e) { setErr('Google sign-in failed: ' + e.message) } finally { setBusy(false) }
  }

  return (
    <Center>
      <div className="card login">
        <div className="logo">PSM</div>
        <h1>Photostat Master</h1>
        <p className="muted">by The Master Sahib</p>
        <p className="sub">{signup ? 'Create your account' : 'Sign in to continue'}</p>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <div className="pw">
          <input placeholder="Password" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} />
          <button className="eye" onClick={() => setShow(s => !s)}>{show ? '🙈' : '👁️'}</button>
        </div>
        {err && <div className="err">{err}</div>}
        <button className="primary" disabled={busy} onClick={submit}>{busy ? '…' : (signup ? 'Sign Up' : 'Sign In')}</button>
        <button className="link" disabled={busy} onClick={() => { setSignup(s => !s); setErr(null) }}>
          {signup ? 'Already have an account? Sign In' : 'New here? Create an account'}
        </button>
        <div className="or">or</div>
        <button className="ghost" disabled={busy} onClick={google}>Continue with Google</button>
      </div>
    </Center>
  )
}

function Main ({ user }) {
  const [tab, setTab] = useState('viewer')
  const [status, setStatus] = useState('')
  const say = (m) => { setStatus(m); if (m) setTimeout(() => setStatus(''), 4000) }

  const tabs = [
    ['viewer', 'Viewer'],
    ['merge', 'Merge'],
    ['split', 'Split'],
    ['img2pdf', 'Images → PDF'],
    ['ocr', 'OCR']
  ]

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="logoSm">PSM</span> Photostat Master</div>
        <nav>
          {tabs.map(([k, label]) => (
            <button key={k} className={tab === k ? 'nav active' : 'nav'} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
        <div className="userBox">
          <div className="email" title={user.email}>{user.email}</div>
          <button className="link" onClick={() => signOut(auth)}>Log out</button>
        </div>
      </aside>
      <main className="content">
        {tab === 'viewer' && <Viewer say={say} />}
        {tab === 'merge' && <Merge say={say} />}
        {tab === 'split' && <Split say={say} />}
        {tab === 'img2pdf' && <Img2Pdf say={say} />}
        {tab === 'ocr' && <Ocr say={say} />}
        {status && <div className="toast">{status}</div>}
      </main>
    </div>
  )
}

function Viewer ({ say }) {
  const [pages, setPages] = useState([])
  const [pdf, setPdf] = useState(null)
  const [busy, setBusy] = useState(false)

  const open = async () => {
    const files = await window.desktop.openFiles(PDF_FILTER, false)
    if (!files.length) return
    setBusy(true); setPages([])
    try {
      const doc = await loadPdf(u8(files[0].bytes).slice())
      setPdf(doc)
      const imgs = []
      const n = Math.min(doc.numPages, 50)
      for (let i = 1; i <= n; i++) {
        const canvas = await renderPageToCanvas(doc, i, 1.3)
        imgs.push(canvas.toDataURL('image/png'))
      }
      setPages(imgs)
      say(`Opened ${files[0].name} (${doc.numPages} pages)`)
    } catch (e) { say('Failed to open: ' + e.message) } finally { setBusy(false) }
  }

  const savePageImage = async (i) => {
    if (!pdf) return
    const bytes = await pageToBytes(pdf, i + 1, 2.5, 'image/png')
    const r = await window.desktop.saveFile(bytes, `page_${i + 1}.png`, IMG_FILTER)
    if (r.ok) say('Saved: ' + r.path)
  }

  return (
    <Panel title="PDF Viewer" actions={<button className="primary" onClick={open} disabled={busy}>{busy ? 'Loading…' : 'Open PDF'}</button>}>
      {pages.length === 0 && <Empty text="Open a PDF to view its pages. Each page can be saved as a high-res image." />}
      <div className="pages">
        {pages.map((src, i) => (
          <div className="page" key={i}>
            <img src={src} alt={`page ${i + 1}`} />
            <button className="small" onClick={() => savePageImage(i)}>Save page {i + 1} as image</button>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Merge ({ say }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    const files = await window.desktop.openFiles(PDF_FILTER, true)
    if (files.length < 2) { say('Select at least 2 PDFs.'); return }
    setBusy(true)
    try {
      const bytes = await mergePdfs(files.map(f => u8(f.bytes).slice()))
      const r = await window.desktop.saveFile(bytes, 'merged.pdf', PDF_FILTER)
      if (r.ok) say('Merged ' + files.length + ' PDFs → ' + r.path)
    } catch (e) { say('Merge failed: ' + e.message) } finally { setBusy(false) }
  }
  return (
    <Panel title="Merge PDFs">
      <Empty text="Combine two or more PDFs into one file." />
      <button className="primary" onClick={run} disabled={busy}>{busy ? 'Merging…' : 'Select PDFs & Merge'}</button>
    </Panel>
  )
}

function Split ({ say }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    const files = await window.desktop.openFiles(PDF_FILTER, false)
    if (!files.length) return
    setBusy(true)
    try {
      const parts = await splitPdf(u8(files[0].bytes).slice())
      let saved = 0
      for (const p of parts) {
        const r = await window.desktop.saveFile(p.bytes, `page_${p.index}.pdf`, PDF_FILTER)
        if (r.ok) saved++
      }
      say(`Saved ${saved}/${parts.length} page PDFs`)
    } catch (e) { say('Split failed: ' + e.message) } finally { setBusy(false) }
  }
  return (
    <Panel title="Split PDF">
      <Empty text="Split a PDF into one file per page (you choose where to save each)." />
      <button className="primary" onClick={run} disabled={busy}>{busy ? 'Splitting…' : 'Select PDF & Split'}</button>
    </Panel>
  )
}

function Img2Pdf ({ say }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    const files = await window.desktop.openFiles(IMG_FILTER, true)
    if (!files.length) return
    setBusy(true)
    try {
      const images = files.map(f => ({
        bytes: u8(f.bytes),
        type: /\.png$/i.test(f.name) ? 'image/png' : 'image/jpeg'
      }))
      const bytes = await imagesToPdf(images)
      const r = await window.desktop.saveFile(bytes, 'images.pdf', PDF_FILTER)
      if (r.ok) say('Created PDF from ' + files.length + ' images → ' + r.path)
    } catch (e) { say('Failed: ' + e.message) } finally { setBusy(false) }
  }
  return (
    <Panel title="Images → PDF">
      <Empty text="Turn a set of images (PNG/JPG) into a single PDF, one image per page." />
      <button className="primary" onClick={run} disabled={busy}>{busy ? 'Working…' : 'Select Images & Make PDF'}</button>
    </Panel>
  )
}

function Ocr ({ say }) {
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [lang, setLang] = useState('eng')
  const [prog, setProg] = useState(0)
  const run = async () => {
    const files = await window.desktop.openFiles(IMG_FILTER, false)
    if (!files.length) return
    setBusy(true); setText(''); setProg(0)
    try {
      const type = /\.png$/i.test(files[0].name) ? 'image/png' : 'image/jpeg'
      const blob = new Blob([u8(files[0].bytes)], { type })
      const out = await ocrImage(blob, lang, p => setProg(Math.round(p * 100)))
      setText(out)
      say('OCR done')
    } catch (e) { say('OCR failed: ' + e.message) } finally { setBusy(false) }
  }
  return (
    <Panel title="OCR (image → text)" actions={
      <select value={lang} onChange={e => setLang(e.target.value)}>
        <option value="eng">English</option>
        <option value="urd+eng">Urdu + English</option>
      </select>
    }>
      <Empty text="Extract text from an image. (Language data downloads on first use when online.)" />
      <button className="primary" onClick={run} disabled={busy}>{busy ? `Reading… ${prog}%` : 'Select Image & Extract Text'}</button>
      {text && <>
        <textarea className="ocrOut" value={text} readOnly rows={12} />
        <button className="small" onClick={() => navigator.clipboard.writeText(text)}>Copy text</button>
      </>}
    </Panel>
  )
}

function Panel ({ title, actions, children }) {
  return (
    <div className="panel">
      <div className="panelHead"><h2>{title}</h2><div>{actions}</div></div>
      <div className="panelBody">{children}</div>
    </div>
  )
}
function Empty ({ text }) { return <p className="muted empty">{text}</p> }
