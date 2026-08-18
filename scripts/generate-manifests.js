#!/usr/bin/env node
/**
 * generate-manifests.js
 *
 * Scans the asset folders below and writes a manifest.json into each one,
 * listing whatever image/video/audio files are actually sitting in that
 * folder. The site's JavaScript fetches these manifest.json files at page
 * load instead of anyone having to hand-edit a list of filenames.
 *
 * This runs automatically as Cloudflare Pages' "Build command" on every
 * deploy. To regenerate manifests locally while testing:
 *
 *   node scripts/generate-manifests.js
 *
 * You should never need to edit this file to add a photo, video, or audio
 * track — just drop the file into the right assets/ folder and push.
 * Ordering follows filename order (numeric-aware), so prefix filenames
 * with numbers (01-, 02-...) or dates if you care about the order they
 * appear/play in.
 *
 * VIDEO POSTERS: for any video, e.g. clip.mp4, add a small poster image
 * named clip.poster.jpg in the same folder and the site will use that
 * lightweight image for thumbnails instead of loading the video itself.
 * Videos without a matching poster still work, just fall back to a
 * (slower) video-based thumbnail.
 */

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.ogg', '.wav'];
const MAX_BYTES = 24 * 1024 * 1024; // Cloudflare Pages caps individual assets at 25 MiB — leave a little headroom

// Which folders to scan, and which kinds of media each one accepts.
const TARGETS = [
  { dir: 'assets/hero-gallery', kinds: ['image'] },
  { dir: 'assets/gallery', kinds: ['image', 'video'] },
  { dir: 'assets/live', kinds: ['image', 'video'] },
  { dir: 'assets/audio', kinds: ['audio'] },
];

function classify(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  return null;
}

function posterNameFor(filename) {
  const ext = path.extname(filename);
  return filename.slice(0, -ext.length) + '.poster.jpg';
}

function run() {
  let hadOversized = false;

  for (const target of TARGETS) {
    const dirPath = path.join(process.cwd(), target.dir);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const allFiles = fs
      .readdirSync(dirPath)
      .filter((name) => !name.startsWith('.') && name !== 'manifest.json');
    const fileSet = new Set(allFiles);

    // Poster images (clip.poster.jpg) are matched to their video and
    // excluded from showing up as their own separate gallery entries.
    const posterFiles = new Set(
      allFiles.filter((name) => name.toLowerCase().endsWith('.poster.jpg'))
    );

    const entries = allFiles
      .filter((name) => !posterFiles.has(name))
      .map((name) => {
        const type = classify(name);
        const entry = { file: name, type };
        if (type === 'video') {
          const poster = posterNameFor(name);
          entry.poster = fileSet.has(poster) ? poster : null;
        }
        return entry;
      })
      .filter((entry) => entry.type && target.kinds.includes(entry.type))
      .filter((entry) => {
        const size = fs.statSync(path.join(dirPath, entry.file)).size;
        if (size > MAX_BYTES) {
          hadOversized = true;
          console.warn(
            `[manifests] SKIPPING ${target.dir}/${entry.file} — ${(size / 1024 / 1024).toFixed(1)} MiB, ` +
            `over Cloudflare's 25 MiB per-file limit. Compress it (see README) and push again.`
          );
          return false;
        }
        return true;
      })
      .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: 'base' }));

    const videosWithoutPoster = entries.filter((e) => e.type === 'video' && !e.poster).length;

    const manifestPath = path.join(dirPath, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2) + '\n');

    console.log(
      `[manifests] ${target.dir}/manifest.json — ${entries.length} file${entries.length === 1 ? '' : 's'}` +
      (videosWithoutPoster ? ` (${videosWithoutPoster} video${videosWithoutPoster === 1 ? '' : 's'} missing a .poster.jpg — see README)` : '')
    );
  }

  if (hadOversized) {
    console.warn('[manifests] One or more files were skipped for being too large. The rest of the site will still deploy fine.');
  }
}

run();
