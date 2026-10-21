import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'public', 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA PNG icons from public/icon.svg...');
  
  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(root, 'public', 'pwa-192x192.png'));
    
  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(root, 'public', 'pwa-512x512.png'));

  // 180x180 for Apple Touch Icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(root, 'public', 'apple-touch-icon.png'));

  // Maskable 512x512 with safe-zone margin (10-15% padding)
  const innerIcon = await sharp(svgBuffer)
    .resize(410, 410)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 15, b: 25, alpha: 1 } // #0b0f19
    }
  })
    .composite([{ input: innerIcon, gravity: 'center' }])
    .png()
    .toFile(path.join(root, 'public', 'pwa-maskable-512x512.png'));

  // Favicon 32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(root, 'public', 'favicon.ico'));

  console.log('All PWA icons successfully generated in /public!');
}

generate().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
