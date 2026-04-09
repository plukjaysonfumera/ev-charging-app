import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const OUT = 'apps/mobile/assets';

if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

// ─── SVG Templates ───────────────────────────────────────────────────────────

function iconSvg(size) {
  const bolt = `
    M ${size * 0.58} ${size * 0.08}
    L ${size * 0.30} ${size * 0.52}
    L ${size * 0.50} ${size * 0.52}
    L ${size * 0.42} ${size * 0.92}
    L ${size * 0.70} ${size * 0.45}
    L ${size * 0.50} ${size * 0.45}
    Z
  `;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#1B4332"/>
      <polygon points="${bolt.trim().replace(/\n\s+/g, ' ')}" fill="none"/>
      <path d="M${size*0.58} ${size*0.08} L${size*0.30} ${size*0.52} L${size*0.50} ${size*0.52} L${size*0.42} ${size*0.92} L${size*0.70} ${size*0.45} L${size*0.50} ${size*0.45} Z"
        fill="#FFFFFF"/>
      <circle cx="${size*0.72}" cy="${size*0.28}" r="${size*0.07}" fill="#52D680"/>
    </svg>
  `;
}

function splashSvg(w, h) {
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#1B4332"/>
      <!-- Icon -->
      <rect x="${w/2 - 80}" y="${h/2 - 160}" width="160" height="160" rx="36" fill="#2D6A4F"/>
      <path d="M${w/2+18} ${h/2-148} L${w/2-24} ${h/2-66} L${w/2+4} ${h/2-66} L${w/2-12} ${h/2-14} L${w/2+36} ${h/2-74} L${w/2+12} ${h/2-74} Z"
        fill="#FFFFFF"/>
      <circle cx="${w/2+36}" cy="${h/2-122}" r="11" fill="#52D680"/>
      <!-- App name -->
      <text x="${w/2}" y="${h/2+28}" font-family="-apple-system, Helvetica, sans-serif"
        font-size="32" font-weight="800" fill="#FFFFFF" text-anchor="middle">PHEV Charging PH</text>
      <!-- Tagline -->
      <text x="${w/2}" y="${h/2+68}" font-family="-apple-system, Helvetica, sans-serif"
        font-size="18" fill="#95D5B2" text-anchor="middle">Find. Charge. Go.</text>
    </svg>
  `;
}

function adaptiveFgSvg(size) {
  const s = size;
  return `
    <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
      <path d="M${s*0.58} ${s*0.08} L${s*0.30} ${s*0.52} L${s*0.50} ${s*0.52} L${s*0.42} ${s*0.92} L${s*0.70} ${s*0.45} L${s*0.50} ${s*0.45} Z"
        fill="#FFFFFF"/>
      <circle cx="${s*0.72}" cy="${s*0.28}" r="${s*0.07}" fill="#52D680"/>
    </svg>
  `;
}

// ─── Generate ─────────────────────────────────────────────────────────────────

console.log('Generating app assets...');

// App icon — 1024x1024
await sharp(Buffer.from(iconSvg(1024)))
  .resize(1024, 1024)
  .png()
  .toFile(`${OUT}/icon.png`);
console.log('✅ icon.png (1024x1024)');

// Splash screen — 1284x2778 (iPhone 14 Pro Max)
await sharp(Buffer.from(splashSvg(1284, 2778)))
  .resize(1284, 2778)
  .png()
  .toFile(`${OUT}/splash.png`);
console.log('✅ splash.png (1284x2778)');

// Splash icon (small, centered) — used by expo-splash-screen
await sharp(Buffer.from(iconSvg(512)))
  .resize(512, 512)
  .png()
  .toFile(`${OUT}/splash-icon.png`);
console.log('✅ splash-icon.png (512x512)');

// Android adaptive icon foreground — 1024x1024 transparent
await sharp(Buffer.from(adaptiveFgSvg(1024)))
  .resize(1024, 1024)
  .png()
  .toFile(`${OUT}/adaptive-icon.png`);
console.log('✅ adaptive-icon.png (1024x1024)');

// Favicon — 48x48
await sharp(Buffer.from(iconSvg(48)))
  .resize(48, 48)
  .png()
  .toFile(`${OUT}/favicon.png`);
console.log('✅ favicon.png (48x48)');

console.log('\n🎉 All assets generated in apps/mobile/assets/');
