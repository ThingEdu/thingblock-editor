/**
 * The pictures some playground objects are drawn with instead of an emoji: the Dế STEM cricket and the
 * village's robot Tre (see static/camera-ai/README.md for their source). They are served from the editor's
 * own static files, so they work offline; until one has loaded, the playground draws the kind's emoji.
 */

/** Object kinds drawn with a picture, the file under static/camera-ai/, and how wide the mark is in its badge. */
const IMAGES = {
    cricket: {file: 'de-stem-cricket.svg', fill: 0.82},
    tre: {file: 'robot-tre.svg', fill: 0.96}
};

const cache = {};

/**
 * The loaded picture for an object kind, starting the load the first time it is asked for.
 * @param {string} kind The object kind.
 * @param {string} base Prefix of the static asset paths.
 * @returns {?HTMLImageElement} The picture once it has loaded; null for a kind without one, or while loading.
 */
export const objectImage = (kind, base) => {
    const entry = IMAGES[kind];
    if (!entry) return null;
    let img = cache[kind];
    if (!img) {
        img = new Image();
        img.src = `${base}static/camera-ai/${entry.file}`;
        cache[kind] = img;
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
};

/**
 * Where a picture goes in its badge: the badge is the object's round hit area (`size` across, as the VM
 * judges touches), and the picture is fitted inside it, keeping its shape.
 * @param {string} kind The object kind.
 * @param {number} size The object's size in pixels.
 * @param {number} aspect The picture's width over its height.
 * @returns {{width: number, height: number}} The picture's size in pixels.
 */
export const pictureSize = (kind, size, aspect) => {
    const box = size * IMAGES[kind].fill;
    return aspect >= 1 ? {width: box, height: box / aspect} : {width: box * aspect, height: box};
};

/**
 * Draw an object with its picture on a light round badge, so the blue cricket and the dark outlines of
 * the robot read on the dark playground. An object moving left is drawn facing left.
 * @param {CanvasRenderingContext2D} ctx The canvas.
 * @param {HTMLImageElement} img The loaded picture.
 * @param {{kind: string, vx: number}} o The object.
 * @param {number} x Centre x, in pixels.
 * @param {number} y Centre y, in pixels.
 * @param {number} size The object's size in pixels.
 */
export const drawPicture = (ctx, img, o, x, y, size) => {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    const {width, height} = pictureSize(o.kind, size, img.naturalWidth / img.naturalHeight);
    ctx.translate(x, y);
    if (o.vx < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();
};
