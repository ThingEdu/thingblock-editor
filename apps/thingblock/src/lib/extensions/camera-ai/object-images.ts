/**
 * The pictures some playground objects are drawn with instead of an emoji: the Dế STEM cricket and the
 * village's robot Tre (see static/camera-ai/README.md for their source). They are served from the editor's
 * own static files, so they work offline; until one has loaded, the playground draws the kind's emoji.
 */

/** Object kinds drawn with a picture, the file under static/camera-ai/, and how wide the mark is in its badge. */
const IMAGES: Record<string, { file: string; fill: number } | undefined> = {
  cricket: { file: 'de-stem-cricket.svg', fill: 0.82 },
  tre: { file: 'robot-tre.svg', fill: 0.96 },
}

/** A playground object: its kind, and its horizontal speed. */
interface PlaygroundObject {
  kind: string
  vx: number
}

const cache: Record<string, HTMLImageElement | undefined> = {}

/**
 * The loaded picture for an object kind, starting the load the first time it is asked for.
 * @param kind The kind of playground object.
 * @param base Prefix of the static asset paths.
 * @returns The picture once it has loaded; null for a kind without one, or while loading.
 */
export const objectImage = (kind: string, base: string): HTMLImageElement | null => {
  const entry = IMAGES[kind]
  if (!entry) return null
  let img = cache[kind]
  if (!img) {
    img = new Image()
    img.src = `${base}static/camera-ai/${entry.file}`
    cache[kind] = img
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

/**
 * Where a picture goes in its badge: the badge is the object's round hit area (`size` across, as the VM
 * judges touches), and the picture is fitted inside it, keeping its shape.
 * @param kind The kind of playground object.
 * @param size The object's size in pixels.
 * @param aspect The picture's width over its height.
 * @returns The picture's size in pixels.
 */
export const pictureSize = (kind: string, size: number, aspect: number): { width: number; height: number } => {
  const entry = IMAGES[kind]
  if (!entry) throw new Error(`pictureSize: no picture for object kind "${kind}"`)
  const box = size * entry.fill
  return aspect >= 1 ? { width: box, height: box / aspect } : { width: box * aspect, height: box }
}

/**
 * Draws an object with its picture on a light round badge, so the blue cricket and the dark outlines of
 * the robot read on the dark playground. An object moving left is drawn facing left.
 * @param ctx The canvas.
 * @param img The loaded picture.
 * @param o The object: its kind, and its horizontal speed `vx`.
 * @param x Centre x, in pixels.
 * @param y Centre y, in pixels.
 * @param size The object's size in pixels.
 */
export const drawPicture = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  o: PlaygroundObject,
  x: number,
  y: number,
  size: number,
) => {
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.beginPath()
  ctx.arc(x, y, size / 2, 0, Math.PI * 2)
  ctx.fill()
  const { width, height } = pictureSize(o.kind, size, img.naturalWidth / img.naturalHeight)
  ctx.translate(x, y)
  if (o.vx < 0) ctx.scale(-1, 1)
  ctx.drawImage(img, -width / 2, -height / 2, width, height)
  ctx.restore()
}
