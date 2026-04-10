const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageUrl = 'https://www.nicepng.com/png/full/438-4385715_police-man-officer-emoji-prince-icon.png';
const tempPath = path.join(__dirname, 'temp_source.png');

function downloadFile(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) { file.close(); return downloadFile(res.headers.location, dest, cb); }
    res.pipe(file);
    file.on('finish', () => { file.close(); cb(); });
  }).on('error', err => { fs.unlink(dest, () => {}); cb(err); });
}

downloadFile(imageUrl, tempPath, async (err) => {
  if (err) { console.error(err.message); return; }

  // Original image: 561 x 606. fit:contain into 700x700:
  // scale = 700/606 = 1.1551 (height-limited)
  // actual content: 648 x 700, offset left = (700-648)/2 = 26px
  const scale = 700 / 606;
  const offX = Math.round((700 - 561 * scale) / 2); // = 26

  // Key coordinates in 700px space:
  // Hat dome: original spans x=65-495, y=5-285 → cx=349,cy=168, rx=250,ry=164
  // Hat band: original y=278-318 → scaled y=321-367
  // Hat brim: original y=310-365 → scaled y=358-422, x=20-540 → scaled x=49-650
  // Face: original center=(280,430), r=210 → scaled center=(349,497), r=243

  const scaledFace = await sharp(tempPath)
    .resize(700, 700, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
    .png()
    .toBuffer();

  // Flat hat overlay — covers all texture, crest, blue color
  const flatHatSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700">
    <!-- Gray hat dome -->
    <ellipse cx="349" cy="165" rx="250" ry="162" fill="#909090"/>
    <!-- Dark band -->
    <rect x="97" y="316" width="506" height="50" fill="#4a4a4a"/>
    <!-- Black brim — wide -->
    <rect x="44" y="358" width="612" height="62" rx="31" fill="#1e1e1e"/>
  </svg>`;

  // Blank face circle
  const faceSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700">
    <circle cx="349" cy="497" r="243" fill="#FDC8C0"/>
  </svg>`;

  const flatHatBuffer  = await sharp(Buffer.from(flatHatSvg)).png().toBuffer();
  const faceBuffer     = await sharp(Buffer.from(faceSvg)).png().toBuffer();

  // Hat portion from ORIGINAL (just the top) — gives us the proper hat outline border
  // We use original outline + flat gray fill on top
  const brimStrip = await sharp(scaledFace).extract({left:0, top:340, width:700, height:90}).toBuffer();

  const outputPath = path.join(__dirname, '..', 'assets', 'images', 'icon.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: {r:26,g:26,b:46,alpha:255} } })
  .composite([
    { input: scaledFace,    left: 162, top: 130 },          // original outline
    { input: faceBuffer,    left: 162, top: 130 },          // blank face
    { input: flatHatBuffer, left: 162, top: 130 },          // flat gray hat covers texture + crest
    { input: faceBuffer,    left: 162, top: 130 },          // face again (hat brim is now over it)
    { input: brimStrip,     left: 162, top: 130 + 340 },   // original brim strip on top
  ])
  .png()
  .toFile(outputPath);

  fs.copyFileSync(outputPath, 'C:/Users/JOHNNG/Desktop/icon_preview.png');
  console.log('Done!');
  fs.unlinkSync(tempPath);
});
