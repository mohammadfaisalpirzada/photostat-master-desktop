import Tesseract from 'tesseract.js'

// langs: 'eng' or 'urd+eng' (language data is fetched on first use when online)
export async function ocrImage (imageData, langs = 'eng', onProgress) {
  const { data } = await Tesseract.recognize(imageData, langs, {
    logger: m => { if (onProgress && m.status === 'recognizing text') onProgress(m.progress) }
  })
  return data.text
}
