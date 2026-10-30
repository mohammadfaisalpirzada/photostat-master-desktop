import { PDFDocument, degrees } from 'pdf-lib'

export async function mergePdfs (buffers) {
  const out = await PDFDocument.create()
  for (const ab of buffers) {
    const src = await PDFDocument.load(ab)
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach(p => out.addPage(p))
  }
  return await out.save()
}

export async function splitPdf (buffer) {
  const src = await PDFDocument.load(buffer)
  const results = []
  for (let i = 0; i < src.getPageCount(); i++) {
    const d = await PDFDocument.create()
    const [pg] = await d.copyPages(src, [i])
    d.addPage(pg)
    results.push({ index: i + 1, bytes: await d.save() })
  }
  return results
}

export async function rotatePdf (buffer, deg = 90) {
  const doc = await PDFDocument.load(buffer)
  doc.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + deg) % 360)))
  return await doc.save()
}

// images: [{ bytes:Uint8Array, type:'image/png'|'image/jpeg' }]
export async function imagesToPdf (images) {
  const doc = await PDFDocument.create()
  for (const img of images) {
    const emb = img.type.includes('png')
      ? await doc.embedPng(img.bytes)
      : await doc.embedJpg(img.bytes)
    const page = doc.addPage([emb.width, emb.height])
    page.drawImage(emb, { x: 0, y: 0, width: emb.width, height: emb.height })
  }
  return await doc.save()
}
