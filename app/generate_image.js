import * as jimp from 'jimp';
const Jimp = jimp.default?.Jimp || jimp.default || jimp.Jimp || jimp;
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGES_DIR = join(__dirname, 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function generate() {
  const width = 800;
  const height = 600;
  let image = new Jimp({ width, height });
  // Set background color
  image.scan(0, 0, width, height, function(x, y, idx) {
    this.bitmap.data[idx] = 0xEE;
    this.bitmap.data[idx+1] = 0xEE;
    this.bitmap.data[idx+2] = 0xEE;
    this.bitmap.data[idx+3] = 0xFF;
  });

  // Draw some random overlapping geometric figures - simpler approach
  for (let i = 0; i < 30; i++) {
    const startX = Math.floor(Math.random() * width);
    const startY = Math.floor(Math.random() * height);
    const w = Math.floor(Math.random() * 200);
    const h = Math.floor(Math.random() * 200);
    const grey = Math.floor(Math.random() * 200);
    
    for (let x = startX; x < Math.min(width, startX + w); x++) {
      for (let y = startY; y < Math.min(height, startY + h); y++) {
         const idx = (width * y + x) * 4;
         image.bitmap.data[idx] = grey;
         image.bitmap.data[idx+1] = grey;
         image.bitmap.data[idx+2] = grey;
         image.bitmap.data[idx+3] = 180;
      }
    }
  }

  await image.write(join(IMAGES_DIR, 'chaotic_pattern.png'));
  console.log('Image generated: chaotic_pattern.png');
}

function drawCircle(image, x, y, r, color) {
  for (let i = x - r; i <= x + r; i++) {
    for (let j = y - r; j <= y + r; j++) {
      if (Math.sqrt(Math.pow(i - x, 2) + Math.pow(j - y, 2)) <= r) {
        if (i >= 0 && i < image.bitmap.width && j >= 0 && j < image.bitmap.height) {
          image.setPixelColor(color, i, j);
        }
      }
    }
  }
}

function drawRect(image, x, y, w, h, color) {
  for (let i = x; i < x + w; i++) {
    for (let j = y; j < y + h; j++) {
      if (i >= 0 && i < image.bitmap.width && j >= 0 && j < image.bitmap.height) {
        image.setPixelColor(color, i, j);
      }
    }
  }
}

function drawLine(image, x1, y1, x2, y2, color) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = (x1 < x2) ? 1 : -1;
  const sy = (y1 < y2) ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (true) {
    if (x >= 0 && x < image.bitmap.width && y >= 0 && y < image.bitmap.height) {
      image.setPixelColor(color, x, y);
    }
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

generate().catch(console.error);
