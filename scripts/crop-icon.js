const sharp = require('sharp');
const fs = require('fs');

const src = 'C:/Users/JOHNNG/Desktop/deadheadhittcharidepngfile.jpg';
const output = 'C:/Users/JOHNNG/hiTTChaRide2/assets/images/icon.png';

async function run() {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = Buffer.from(data);
  const { width, height, channels } = info;
  const NAVY_R = 26, NAVY_G = 26, NAVY_B = 46;

  // Flood fill from edges — replace checkerboard background with navy
  // Stop at dark pixels (the thick black outline)
  const visited = new Uint8Array(width * height);
  const queue = [];

  function seed(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    if (visited[y * width + x]) return;
    const i = (y * width + x) * channels;
    const avg = (buf[i] + buf[i+1] + buf[i+2]) / 3;
    if (avg < 80) return; // stop at black outline
    visited[y * width + x] = 1;
    queue.push([x, y]);
  }

  for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height-1); }
  for (let y = 0; y < height; y++) { seed(0, y); seed(width-1, y); }

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const i = (y * width + x) * channels;
    buf[i] = NAVY_R; buf[i+1] = NAVY_G; buf[i+2] = NAVY_B;
    seed(x-1,y); seed(x+1,y); seed(x,y-1); seed(x,y+1);
  }

  // Restore white face circle (flood fill removes it since face=white=background)
  // Face center approximately at (width/2, height*0.62), radius ~width*0.38
  const faceCX = Math.round(width * 0.50);
  const faceCY = Math.round(height * 0.63);
  const faceR  = Math.round(width * 0.37);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - faceCX)**2 + (y - faceCY)**2);
      if (dist < faceR) {
        const i = (y * width + x) * channels;
        const isNavy = buf[i] === NAVY_R && buf[i+1] === NAVY_G && buf[i+2] === NAVY_B;
        if (isNavy) { buf[i] = 248; buf[i+1] = 248; buf[i+2] = 248; }
      }
    }
  }

  // Replace navy pixels with white
  for (let i = 0; i < width * height; i++) {
    const ci = i * channels;
    if (buf[ci] === NAVY_R && buf[ci+1] === NAVY_G && buf[ci+2] === NAVY_B) {
      buf[ci] = 255; buf[ci+1] = 255; buf[ci+2] = 255;
    }
  }

  // Resize to 1024x1024 on clean white background
  const resized = await sharp(buf, { raw: { width, height, channels } })
    .png().toBuffer()
    .then(b => sharp(b).resize(900, 900, { fit: 'contain', background: { r:255,g:255,b:255,alpha:255 } }).toBuffer());

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r:255,g:255,b:255,alpha:255 } } })
    .composite([{ input: resized, left: 62, top: 62 }])
    .png()
    .toFile(output);

  fs.copyFileSync(output, 'C:/Users/JOHNNG/Desktop/icon_preview.png');
  console.log('Done!');
}

run().catch(console.error);
