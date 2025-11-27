#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LANGS = ['nl', 'en'];
const srcRoot = path.resolve(__dirname, '../../src/shared/locales');
const destRoot = path.resolve(__dirname, '../src/locales');

function copyFileSafe(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

try {
  for (const lang of LANGS) {
    const srcFile = path.join(srcRoot, lang, 'common.json');
    const destFile = path.join(destRoot, lang, 'common.json');
    if (!fs.existsSync(srcFile)) {
      console.warn(`[copy-locales] Source missing: ${srcFile}`);
      continue;
    }
    copyFileSafe(srcFile, destFile);
    console.log(`[copy-locales] Copied ${lang} -> ${destFile}`);
  }
  // Also drop a marker file so folder always exists (useful for dev)
  const marker = path.join(destRoot, '.gitkeep');
  fs.mkdirSync(destRoot, { recursive: true });
  if (!fs.existsSync(marker)) fs.writeFileSync(marker, '');
} catch (err) {
  console.error('[copy-locales] Failed:', err?.message || err);
  process.exit(0); // don't fail build on copy script
}
