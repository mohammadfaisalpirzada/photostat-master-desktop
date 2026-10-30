import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function loadPdf (data) {
  return await pdfjsLib.getDocument({ data }).promise
}

export async function renderPageToCanvas (pdf, pageNum, scale = 1.5) {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

export async function pageToBytes (pdf, pageNum, scale = 2.5, type = 'image/png', quality = 0.95) {
  const canvas = await renderPageToCanvas(pdf, pageNum, scale)
  const blob = await new Promise(res => canvas.toBlob(res, type, quality))
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}
