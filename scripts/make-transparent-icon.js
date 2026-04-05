const sharp = require('sharp');

const src    = 'C:/Users/JOHNNG/Desktop/deadheadhittcharidepngfile.jpg';
const output = 'C:/Users/JOHNNG/hiTTChaRide2/assets/images/icon-transparent.png';

async function run() {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = Buffer.from(data);
  const { width, height, channels } = info;

  const MARK_R = 26, MARK_G = 26, MARK_B = 46; // sentinel colour

  // ── 1. Flood-fill background from edges → sentinel colour
  const visited = new Uint8Array(width * height);
  const queue   = [];

  function seed(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    if (visited[y * width + x]) return;
    const i   = (y * width + x) * channels;
    const avg = (buf[i] + buf[i+1] + buf[i+2]) / 3;
    if (avg < 80) return;           // stop at black outline
    visited[y * width + x] = 1;
    queue.push([x, y]);
  }

  for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
  for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }

  while (queue.length) {
    const [x, y] = queue.shift();
    const i = (y * width + x) * channels;
    buf[i] = MARK_R; buf[i+1] = MARK_G; buf[i+2] = MARK_B;
    seed(x-1,y); seed(x+1,y); seed(x,y-1); seed(x,y+1);
  }

  // ── 2. Restore white face circle (flood fill turns it sentinel too)
  const faceCX = Math.round(width * 0.50);
  const faceCY = Math.round(height * 0.63);
  const faceR  = Math.round(width * 0.37);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - faceCX) ** 2 + (y - faceCY) ** 2);
      if (dist < faceR) {
        const i = (y * width + x) * channels;
        const isSentinel = buf[i] === MARK_R && buf[i+1] === MARK_G && buf[i+2] === MARK_B;
        if (isSentinel) { buf[i] = 248; buf[i+1] = 248; buf[i+2] = 248; }
      }
    }
  }

  // ── 3. Make sentinel pixels fully transparent (background removed)
  for (let i = 0; i < width * height; i++) {
    const ci = i * channels;
    if (buf[ci] === MARK_R && buf[ci+1] === MARK_G && buf[ci+2] === MARK_B) {
      buf[ci+3] = 0; // alpha → transparent
    }
  }

  // ── 4. Resize to 1024×1024 preserving transparency
  const resized = await sharp(buf, { raw: { width, height, channels } })
    .png()
    .toBuffer()
    .then(b =>
      sharp(b)
        .resize(900, 900, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
        .toBuffer()
    );

  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r:0, g:0, b:0, alpha:0 } },
  })
    .composite([{ input: resized, left: 62, top: 62 }])
    .png()
    .toFile(output);

  require('fs').copyFileSync(output, 'C:/Users/JOHNNG/Desktop/icon_transparent_preview.png');
  console.log('Done! Transparent icon saved.');
}

run().catch(console.error);
