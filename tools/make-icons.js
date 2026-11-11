// Regenerates the app icons: node tools/make-icons.js  (needs Playwright + Python Pillow)
const { chromium } = require('playwright');
const path = require('path');
const { execFileSync } = require('child_process');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a7be8"/><stop offset="1" stop-color="#ffb37a"/></linearGradient></defs>
<rect width="1024" height="1024" fill="url(#s)"/>
<circle cx="760" cy="300" r="90" fill="#fff4c8"/>
<rect y="470" width="1024" height="554" fill="#2f9a6a"/>
<polygon points="512,470 1010,1024 14,1024" fill="#f1f3f7"/>
<polygon points="512,470 960,1024 64,1024" fill="#3a4152"/>
<polygon points="505,560 519,560 524,660 500,660" fill="#fff"/><polygon points="497,740 527,740 536,900 488,900" fill="#fff"/>
<g transform="translate(272,150) scale(20)"><path d="M12 2 21 5v6c0 6-4 10-9 12C7 21 3 17 3 11V5z" fill="#ffc533" stroke="#fff" stroke-width="1.3"/>
<path d="M7.5 12.5 11 16l5.5-7.5" fill="none" stroke="#0b1b3a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
</svg>`;
(async () => {
  const b = await chromium.launch();
  const out = path.join(__dirname, '..', 'www', 'icons');
  for (const size of [1024, 512, 192, 180]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
    const f = path.join(out, `icon-${size}.png`);
    await p.screenshot({ path: f });
    // App Store icons must not have an alpha channel.
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[1])', f]);
  }
  await b.close();
})();
