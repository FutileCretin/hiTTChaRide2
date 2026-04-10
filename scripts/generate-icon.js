const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 580" width="1024" height="1024">

  <!-- Dark navy background -->
  <rect width="520" height="580" fill="#1a1a2e"/>

  <!-- FACE — drawn first so hat brim covers the top -->
  <circle cx="260" cy="390" r="168"
    fill="#FDC8C0" stroke="#2a2a2a" stroke-width="13"/>

  <!-- HAT DOME — wide and low like a police peaked cap -->
  <ellipse cx="260" cy="148" rx="158" ry="70"
    fill="#909090" stroke="#2a2a2a" stroke-width="13"/>

  <!-- Hat band — tight strip connecting dome to brim -->
  <rect x="100" y="206" width="320" height="22"
    fill="#3a3a3a"/>

  <!-- Hat brim — overlaps the top of the face circle -->
  <rect x="30" y="218" width="460" height="50" rx="25"
    fill="#1e1e1e" stroke="#2a2a2a" stroke-width="13"/>

</svg>`;

const outputPath = path.join(__dirname, '..', 'assets', 'images', 'icon.png');

sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath)
  .then(() => {
    require('fs').copyFileSync(outputPath, 'C:/Users/JOHNNG/Desktop/icon_preview.png');
    console.log('Done!');
  })
  .catch(err => console.error('Failed:', err.message));
