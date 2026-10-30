# Photostat Master — Desktop

Windows desktop companion to the Photostat Master Android app. Same Firebase
project, so **login and cloud data are shared** with the mobile app.

Built with **Electron + React (Vite)**. Features:
- 🔐 Login / Sign-up (email + password, Google) — same account as Android
- 📄 **PDF Viewer** — open & view pages, save any page as a high-res image
- 🔗 **Merge** PDFs · ✂️ **Split** into per-page PDFs
- 🖼️ **Images → PDF** (image maker)
- 🔤 **OCR** — image → text (English, Urdu+English via Tesseract.js)

## Run locally (dev)
```
npm install
npm run dev
```

## Build the Windows installer (.exe)
```
npm install
npm run dist
```
Output: `release/Photostat-Master-Setup.exe`

## Auto-build (GitHub Actions)
`.github/workflows/build-desktop.yml` builds the `.exe` on every push (Windows
runner) and publishes it to the **latest** GitHub release — stable download link.

## Notes / TODO
- Firebase config in `src/firebase.js` uses the project's browser API key. For
  best results register a **Web app** in Firebase console and paste its config
  (adds a proper `appId`). Add the app's domain to **Auth → Settings →
  Authorized domains** if Google sign-in popup is blocked.
- OCR language data downloads on first use (needs internet). Can be bundled
  offline later.
- Roadmap: CNIC duplex sheet, collage, annotation, recent-files sync, auto-update.

— The Master Sahib
