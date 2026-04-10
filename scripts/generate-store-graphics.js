const sharp = require('sharp');
const path  = require('path');
const out   = 'C:/Users/JOHNNG/Desktop/hiTTChaRide';

const NAVY   = '#1a1a2e';
const BLUE   = '#1565C0';
const WHITE  = '#ffffff';
const GREEN  = '#4CAF50';
const GRAY   = '#8892a4';

// ── Helper: render SVG → PNG file ─────────────────────────────────────────
async function saveSvg(svg, filename, w, h) {
  await sharp(Buffer.from(svg))
    .resize(w, h)
    .png()
    .toFile(path.join(out, filename));
  console.log('✓', filename);
}

// ── 1. Store icon 512×512 ─────────────────────────────────────────────────
async function storeIcon() {
  await sharp('C:/Users/JOHNNG/hiTTChaRide2/assets/images/icon.png')
    .resize(512, 512)
    .png()
    .toFile(path.join(out, '01_store_icon_512.png'));
  console.log('✓ 01_store_icon_512.png');
}

// ── 2. Feature graphic 1024×500 ───────────────────────────────────────────
async function featureGraphic() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
    <rect width="1024" height="500" fill="${NAVY}"/>
    <!-- Subtle grid lines -->
    <line x1="0" y1="166" x2="1024" y2="166" stroke="#ffffff08" stroke-width="1"/>
    <line x1="0" y1="333" x2="1024" y2="333" stroke="#ffffff08" stroke-width="1"/>
    <line x1="256" y1="0" x2="256" y2="500" stroke="#ffffff08" stroke-width="1"/>
    <line x1="512" y1="0" x2="512" y2="500" stroke="#ffffff08" stroke-width="1"/>
    <line x1="768" y1="0" x2="768" y2="500" stroke="#ffffff08" stroke-width="1"/>
    <!-- Blue glow circle -->
    <circle cx="512" cy="250" r="180" fill="${BLUE}" opacity="0.12"/>
    <!-- App name -->
    <text x="512" y="210" font-family="Arial Black, Arial" font-size="88" font-weight="900"
      fill="${WHITE}" text-anchor="middle">hiTTChaRide</text>
    <!-- Tagline line 1 -->
    <text x="512" y="268" font-family="Arial, sans-serif" font-size="32" font-weight="400"
      fill="${GRAY}" text-anchor="middle">Deadhead to your division</text>
    <!-- Tagline line 2 -->
    <text x="512" y="314" font-family="Arial, sans-serif" font-size="32" font-weight="400"
      fill="${GRAY}" text-anchor="middle">with a friend!</text>
  </svg>`;
  await saveSvg(svg, '02_feature_graphic_1024x500.png', 1024, 500);
}

// ── 3. Screenshots 1080×1920 ──────────────────────────────────────────────

async function screenshotLock() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <rect width="1080" height="1920" fill="${NAVY}"/>
    <!-- Status bar -->
    <rect width="1080" height="60" fill="#11112a"/>
    <text x="80" y="42" font-family="Arial" font-size="28" fill="${WHITE}">9:41</text>
    <!-- Logo placeholder circle -->
    <circle cx="540" cy="750" r="220" fill="#ffffff10"/>
    <circle cx="540" cy="750" r="190" fill="#ffffff08"/>
    <text x="540" y="680" font-family="Arial" font-size="120" text-anchor="middle">🚌</text>
    <text x="540" y="810" font-family="Arial" font-size="52" text-anchor="middle" fill="#ffffff40">hiTTChaRide</text>
    <!-- Title -->
    <text x="540" y="1050" font-family="Arial Black, Arial" font-size="72" font-weight="900"
      fill="${WHITE}" text-anchor="middle">hiTTChaRide</text>
    <text x="540" y="1120" font-family="Arial" font-size="36" fill="${GRAY}" text-anchor="middle">Unlock your device to continue</text>
    <!-- Unlock button -->
    <rect x="240" y="1220" width="600" height="100" rx="28" fill="${BLUE}"/>
    <text x="540" y="1285" font-family="Arial Black, Arial" font-size="40" font-weight="700"
      fill="${WHITE}" text-anchor="middle">Unlock</text>
  </svg>`;
  await saveSvg(svg, '03_screenshot_lock.png', 1080, 1920);
}

async function screenshotHome() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <rect width="1080" height="1920" fill="${NAVY}"/>
    <rect width="1080" height="60" fill="#11112a"/>
    <text x="80" y="42" font-family="Arial" font-size="28" fill="${WHITE}">9:41</text>
    <!-- Header -->
    <circle cx="120" cy="200" r="56" fill="#1e2a3a"/>
    <text x="120" y="215" font-family="Arial" font-size="44" text-anchor="middle">👷</text>
    <text x="210" y="180" font-family="Arial" font-size="28" fill="${GRAY}">Welcome back</text>
    <text x="210" y="224" font-family="Arial Black, Arial" font-size="44" font-weight="700" fill="${WHITE}">John Ng</text>
    <text x="210" y="260" font-family="Arial" font-size="28" fill="${BLUE}">Badge #82821</text>
    <!-- Section label -->
    <text x="60" y="370" font-family="Arial" font-size="28" font-weight="600" fill="${GRAY}" letter-spacing="3">WHAT WOULD YOU LIKE TO DO?</text>
    <!-- Button 1: Hitch a Ride -->
    <rect x="40" y="400" width="1000" height="280" rx="40" fill="#1e2535" stroke="#2a3a4a" stroke-width="2"/>
    <text x="100" y="490" font-family="Arial" font-size="72">🗺</text>
    <text x="100" y="570" font-family="Arial Black, Arial" font-size="52" font-weight="800" fill="${WHITE}">Hitch a Ride</text>
    <text x="100" y="630" font-family="Arial" font-size="34" fill="#ffffff99">See all operators currently broadcasting on the map</text>
    <!-- Button 2: Broadcast -->
    <rect x="40" y="710" width="1000" height="280" rx="40" fill="${BLUE}"/>
    <text x="100" y="800" font-family="Arial" font-size="72">📡</text>
    <text x="100" y="880" font-family="Arial Black, Arial" font-size="52" font-weight="800" fill="${WHITE}">Broadcast Location</text>
    <text x="100" y="940" font-family="Arial" font-size="34" fill="#ffffff99">Enter your bus number to start broadcasting</text>
  </svg>`;
  await saveSvg(svg, '04_screenshot_home.png', 1080, 1920);
}

async function screenshotMap() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <!-- Map background -->
    <rect width="1080" height="1920" fill="#1a1a2e"/>
    <!-- Fake road grid -->
    <line x1="0" y1="400" x2="1080" y2="500" stroke="#16213e" stroke-width="24"/>
    <line x1="0" y1="700" x2="1080" y2="750" stroke="#16213e" stroke-width="40"/>
    <line x1="0" y1="1000" x2="1080" y2="950" stroke="#16213e" stroke-width="24"/>
    <line x1="0" y1="1300" x2="1080" y2="1200" stroke="#16213e" stroke-width="32"/>
    <line x1="200" y1="0" x2="300" y2="1920" stroke="#16213e" stroke-width="24"/>
    <line x1="500" y1="0" x2="560" y2="1920" stroke="#16213e" stroke-width="40"/>
    <line x1="800" y1="0" x2="850" y2="1920" stroke="#16213e" stroke-width="24"/>
    <!-- Bus circles -->
    <circle cx="320" cy="600" r="55" fill="${BLUE}" stroke="${WHITE}" stroke-width="6"/>
    <text x="320" y="592" font-family="Arial" font-size="26" font-weight="800" fill="${WHITE}" text-anchor="middle">#3168</text>
    <text x="320" y="622" font-family="Arial" font-size="20" font-weight="700" fill="#90CAF9" text-anchor="middle">AGRA</text>
    <circle cx="700" cy="850" r="55" fill="${BLUE}" stroke="${WHITE}" stroke-width="6"/>
    <text x="700" y="842" font-family="Arial" font-size="26" font-weight="800" fill="${WHITE}" text-anchor="middle">#8821</text>
    <text x="700" y="872" font-family="Arial" font-size="20" font-weight="700" fill="#90CAF9" text-anchor="middle">MLGA</text>
    <circle cx="200" cy="1100" r="55" fill="${GREEN}" stroke="${WHITE}" stroke-width="6"/>
    <text x="200" y="1092" font-family="Arial" font-size="26" font-weight="800" fill="${WHITE}" text-anchor="middle">#4412</text>
    <text x="200" y="1122" font-family="Arial" font-size="20" font-weight="700" fill="#90CAF9" text-anchor="middle">WLGA</text>
    <!-- Back button -->
    <rect x="30" y="100" width="160" height="70" rx="35" fill="#1e2535" stroke="#2a3a4a" stroke-width="2"/>
    <text x="110" y="145" font-family="Arial" font-size="30" font-weight="600" fill="${WHITE}" text-anchor="middle">← Back</text>
    <!-- Count badge -->
    <rect x="890" y="100" width="160" height="70" rx="35" fill="${BLUE}"/>
    <text x="970" y="145" font-family="Arial" font-size="28" font-weight="700" fill="${WHITE}" text-anchor="middle">3 live</text>
    <!-- Info card -->
    <rect x="30" y="1550" width="1020" height="320" rx="40" fill="#1e2535" stroke="#2a3a4a" stroke-width="2"/>
    <circle cx="120" cy="1650" r="52" fill="#1a2a3a"/>
    <text x="120" y="1666" font-family="Arial" font-size="44" text-anchor="middle">👷</text>
    <text x="210" y="1630" font-family="Arial Black" font-size="40" fill="${WHITE}">Sarah M.</text>
    <text x="210" y="1672" font-family="Arial" font-size="28" fill="${GRAY}">Badge #74521</text>
    <text x="210" y="1714" font-family="Arial" font-size="32" font-weight="600" fill="${BLUE}">Bus #3168</text>
    <!-- Bell button -->
    <circle cx="950" cy="1660" r="60" fill="${BLUE}"/>
    <text x="950" y="1678" font-family="Arial" font-size="44" text-anchor="middle">🔔</text>
    <!-- X button -->
    <circle cx="950" cy="1790" r="40" fill="#2a3a4a"/>
    <text x="950" y="1804" font-family="Arial" font-size="32" font-weight="700" fill="${GRAY}" text-anchor="middle">✕</text>
  </svg>`;
  await saveSvg(svg, '05_screenshot_map.png', 1080, 1920);
}

async function screenshotBroadcast() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <rect width="1080" height="1920" fill="${NAVY}"/>
    <rect width="1080" height="60" fill="#11112a"/>
    <text x="80" y="42" font-family="Arial" font-size="28" fill="${WHITE}">9:41</text>
    <!-- Back -->
    <rect x="40" y="100" width="160" height="70" rx="35" fill="#1e2535" stroke="#2a3a4a" stroke-width="2"/>
    <text x="120" y="145" font-family="Arial" font-size="30" font-weight="600" fill="${WHITE}" text-anchor="middle">← Back</text>
    <!-- Pulse rings -->
    <circle cx="540" cy="700" r="280" fill="${GREEN}" opacity="0.06"/>
    <circle cx="540" cy="700" r="220" fill="${GREEN}" opacity="0.10"/>
    <!-- Inner circle -->
    <circle cx="540" cy="700" r="160" fill="#1a3a1a" stroke="${GREEN}" stroke-width="6"/>
    <text x="540" y="720" font-family="Arial" font-size="100" text-anchor="middle">📡</text>
    <!-- Status -->
    <text x="540" y="950" font-family="Arial Black, Arial" font-size="64" font-weight="800"
      fill="${GREEN}" text-anchor="middle">Broadcasting</text>
    <text x="540" y="1020" font-family="Arial" font-size="44" fill="${WHITE}" text-anchor="middle">Bus #3168</text>
    <!-- Garage badge -->
    <rect x="390" y="1060" width="300" height="70" rx="35" fill="${BLUE}"/>
    <text x="540" y="1105" font-family="Arial Black" font-size="34" font-weight="800" fill="${WHITE}" text-anchor="middle">AGRA</text>
    <!-- Timer -->
    <rect x="80" y="1180" width="920" height="180" rx="32" fill="#1e2535" stroke="#2a3a4a" stroke-width="2"/>
    <text x="540" y="1250" font-family="Arial" font-size="28" fill="${GRAY}" text-anchor="middle">TIME REMAINING</text>
    <text x="540" y="1330" font-family="Arial Black, Arial" font-size="96" font-weight="800" fill="${WHITE}" text-anchor="middle">59:47</text>
    <!-- Note -->
    <text x="540" y="1460" font-family="Arial" font-size="30" fill="${GRAY}" text-anchor="middle">Broadcasting continues with screen off</text>
    <!-- Stop button -->
    <rect x="240" y="1560" width="600" height="100" rx="28" fill="#1e2535" stroke="#e53935" stroke-width="2"/>
    <text x="540" y="1625" font-family="Arial Black, Arial" font-size="38" font-weight="700"
      fill="#e53935" text-anchor="middle">Stop Broadcasting</text>
  </svg>`;
  await saveSvg(svg, '06_screenshot_broadcast.png', 1080, 1920);
}

// Run all
(async () => {
  await storeIcon();
  await featureGraphic();
  await screenshotLock();
  await screenshotHome();
  await screenshotMap();
  await screenshotBroadcast();
  console.log('\nAll store graphics saved to Desktop/hiTTChaRide!');
})().catch(console.error);
