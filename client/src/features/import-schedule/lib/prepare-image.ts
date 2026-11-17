const MAX_SIDE = 2400
const MIN_SIDE = 1600
const MAX_BYTES_AS_IS = 3 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Large phone photos are scaled down to 2400 px: the text stays readable, while the
 * upload and the AI cost shrink. Small screenshots (e.g. 588×800 from a messenger)
 * are scaled UP to 1600 px: on the original, Kazakh letters (Қ, Ә) and similar names
 * are a few pixels tall and the model misreads them; 2× upscaling fixed that in tests.
 */
export async function prepareImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Выберите изображение PNG, JPEG или WebP.')
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Не удалось открыть изображение.')
  })
  const longest = Math.max(bitmap.width, bitmap.height)
  const scale =
    longest < MIN_SIDE ? Math.min(3, MIN_SIDE / longest) : Math.min(1, MAX_SIDE / longest)
  if (scale === 1 && file.size <= MAX_BYTES_AS_IS) {
    bitmap.close()
    return readAsDataUrl(file)
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Браузер не может обработать изображение.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  // Upscaled screenshots stay PNG so the letters are not blurred by JPEG artifacts.
  const blob = await new Promise<Blob | null>((resolve) =>
    scale > 1
      ? canvas.toBlob(resolve, 'image/png')
      : canvas.toBlob(resolve, 'image/jpeg', 0.92),
  )
  if (!blob) throw new Error('Не удалось сжать изображение.')
  return readAsDataUrl(blob)
}
