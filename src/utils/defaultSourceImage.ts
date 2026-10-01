/**
 * Procedurally draws a simple radial gradient as the app's out-of-the-box
 * media source — so the default preset shows its full range of shape bins
 * immediately, instead of one flat color (uniform luminance quantizes every
 * cell into the same bin). No bundled binary asset needed.
 */
export async function createDefaultSourceImage(): Promise<HTMLImageElement> {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('createDefaultSourceImage: 2D context unavailable')

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(1, '#000000')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const image = new Image()
  image.src = canvas.toDataURL('image/png')
  await image.decode()
  return image
}
