#!/usr/bin/env node
/**
 * generate-manifests.js
 *
 * Scans the asset folders below and writes a manifest.json into each one,
 * listing whatever image/video files are actually sitting in that folder.
 * The site's JavaScript fetches these manifest.json files at page load
 * instead of anyone having to hand-edit a list of filenames.
 *
 * This runs automatically as Cloudflare Pages' "Build command" on every
 * deploy (see README / deployment notes). To regenerate manifests locally
 * while testing, just run:
 *
 *   node scripts/generate-manifests.js
 *
 * You should never need to edit this file to add a photo or video — just
 * drop the file into the right assets/ folder and push. Ordering within
 * a gallery follows filename order (numeric-aware), so prefix filenames
 * with numbers (01-, 02-...) or dates if you care about the order they
 * appear in.
 */

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];

// Which folders to scan, and which kinds of media each one accepts.
const TARGETS = [
  { dir: 'assets/hero-gallery', kinds: ['image'] },
  { dir: 'assets/gallery', kinds: ['image', 'video'] },
  { dir: 'assets/live', kinds: ['image', 'video'] },
];

function classify(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return null;
}

function run() {
  for (const target of TARGETS) {
    const dirPath = path.join(process.cwd(), target.dir);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const entries = fs
      .readdirSync(dirPath)
      .filter((name) => !name.startsWith('.') && name !== 'manifest.json')
      .map((name) => ({ file: name, type: classify(name) }))
      .filter((entry) => entry.type && target.kinds.includes(entry.type))
      .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: 'base' }));

    const manifestPath = path.join(dirPath, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2) + '\n');

    console.log(
      `[manifests] ${target.dir}/manifest.json — ${entries.length} file${entries.length === 1 ? '' : 's'}`
    );
  }
}

run();
