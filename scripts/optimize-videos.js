#!/usr/bin/env node
/**
 * optimize-videos.js
 *
 * Batch-compresses every video sitting in assets/gallery/ and assets/live/,
 * and generates a matching .poster.jpg for each one (see
 * generate-manifests.js for what the poster is used for).
 *
 * Safe to re-run: each video gets a small marker file (clip.mp4.optimized)
 * once it's done, so running this again after adding new videos only
 * touches the new ones — it won't re-compress (and re-degrade) anything
 * already processed. The marker files should be committed to git along
 * with everything else, so this stays true for both of you sharing the
 * repo, not just on one person's machine.
 *
 * This is a LOCAL tool — you run it yourself before committing/pushing.
 * It is NOT part of the Cloudflare build (ffmpeg isn't guaranteed to be
 * available there, and re-encoding 50 videos on every single deploy would
 * be slow anyway).
 *
 * Requires ffmpeg installed locally:
 *   Mac:      brew install ffmpeg
 *   Windows:  winget install ffmpeg   (or download from ffmpeg.org)
 *
 * Usage:
 *   node scripts/optimize-videos.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIRS = ['assets/gallery', 'assets/live'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v'];

function hasFFmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function fileSizeMB(p) {
  return (fs.statSync(p).size / 1024 / 1024).toFixed(1);
}

function run() {
  if (!hasFFmpeg()) {
    console.error('ffmpeg not found on this computer.');
    console.error('Install it first:');
    console.error('  Mac:      brew install ffmpeg');
    console.error('  Windows:  winget install ffmpeg   (or download from ffmpeg.org)');
    process.exit(1);
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let beforeTotal = 0;
  let afterTotal = 0;

  for (const dir of DIRS) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) continue;

    // Clean up any leftover .tmp.mp4 / .remux.mp4 files from a previous
    // interrupted run first — these are always safe to delete (they're
    // never the source of truth), and if left behind they'd otherwise get
    // picked up below as if they were real source videos.
    for (const name of fs.readdirSync(dirPath)) {
      if (name.endsWith('.tmp.mp4') || name.endsWith('.remux.mp4')) {
        fs.unlinkSync(path.join(dirPath, name));
        console.log(`Cleaned up leftover from an interrupted run: ${dir}/${name}`);
      }
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((name) => VIDEO_EXTENSIONS.includes(path.extname(name).toLowerCase()))
      .filter((name) => !name.endsWith('.tmp.mp4') && !name.endsWith('.remux.mp4'));

    for (const name of files) {
      const original = path.join(dirPath, name);
      const base = name.slice(0, -path.extname(name).length);
      const finalPath = path.join(dirPath, base + '.mp4');
      const marker = finalPath + '.optimized';
      const poster = path.join(dirPath, base + '.poster.jpg');
      const tmp = path.join(dirPath, base + '.tmp.mp4');

      if (fs.existsSync(marker)) {
        skipped++;
        continue;
      }

      try {
        const beforeSize = fs.statSync(original).size;
        console.log(`Optimizing: ${dir}/${name}  (${(beforeSize / 1024 / 1024).toFixed(1)} MiB)`);

        // Full re-encode: scale caps the LARGER dimension at 1920x1080 but
        // never upscales anything smaller than that (min(...) guards both
        // dimensions against the source's own size).
        execFileSync('ffmpeg', [
          '-y', '-i', original,
          '-vf', "scale='min(iw,1920)':'min(ih,1080)':force_original_aspect_ratio=decrease:force_divisible_by=2",
          '-c:v', 'libx264', '-crf', '28', '-preset', 'slow',
          '-movflags', '+faststart',
          '-c:a', 'aac', '-b:a', '128k',
          '-loglevel', 'error',
          tmp,
        ], { stdio: ['ignore', 'ignore', 'inherit'] });

        let resultPath = tmp;
        let method = 're-encoded';

        // Safety net: if re-encoding somehow didn't help (rare, but exactly
        // what happened before this filter was fixed), fall back to a
        // remux — just repackaging into .mp4 with faststart, no quality
        // loss, no re-encode — rather than ever shipping a larger file.
        if (fs.statSync(tmp).size >= beforeSize) {
          const remux = path.join(dirPath, base + '.remux.mp4');
          execFileSync('ffmpeg', [
            '-y', '-i', original,
            '-c', 'copy',
            '-movflags', '+faststart',
            '-loglevel', 'error',
            remux,
          ], { stdio: ['ignore', 'ignore', 'inherit'] });
          fs.unlinkSync(tmp);
          resultPath = remux;
          method = 're-encode was larger, remuxed instead';
        }

        if (original !== finalPath) fs.unlinkSync(original);
        fs.renameSync(resultPath, finalPath);

        if (!fs.existsSync(poster)) {
          execFileSync('ffmpeg', [
            '-y', '-i', finalPath,
            '-ss', '00:00:00.5', '-frames:v', '1', '-update', '1',
            '-loglevel', 'error',
            poster,
          ], { stdio: ['ignore', 'ignore', 'inherit'] });
        }

        fs.writeFileSync(marker, '');
        const afterSize = fs.statSync(finalPath).size;
        beforeTotal += beforeSize;
        afterTotal += afterSize;
        processed++;
        console.log(`  -> ${(beforeSize / 1024 / 1024).toFixed(1)} MiB -> ${(afterSize / 1024 / 1024).toFixed(1)} MiB (${method}), plus poster`);
      } catch (err) {
        failed++;
        console.error(`  -> FAILED on ${name}: ${err.message}`);
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      }
    }
  }

  console.log('');
  console.log(`Done. ${processed} optimized, ${skipped} already done (skipped), ${failed} failed.`);
  if (processed) {
    console.log(`Total: ${(beforeTotal / 1024 / 1024).toFixed(0)} MiB -> ${(afterTotal / 1024 / 1024).toFixed(0)} MiB.`);
  }
  console.log('Now run: node scripts/generate-manifests.js');
}

run();
