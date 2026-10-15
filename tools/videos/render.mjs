#!/usr/bin/env node
// Render the manim explainer videos and write media/manifest.js for the site.
//
//   node tools/videos/render.mjs                 render every videos/scenes/<id>.py
//   node tools/videos/render.mjs --only roots    render one (repeat or comma-separate)
//   node tools/videos/render.mjs --quality h     l = 480p15, m = 720p30 (default), h = 1080p60
//   node tools/videos/render.mjs --manifest-only rebuild media/manifest.js without rendering
//
// Each scene file defines a class called Main (see videos/lib/narrated.py). Output goes to
// media/video/<id>.mp4 plus media/video/<id>.vtt captions. If media/audio/videos/<id>/music.mp3
// exists it is mixed under the narration at low volume.
//
// The manim executable is found from $MANIM, then ~/.venvs/manim/bin/manim, then `manim` on PATH.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCENES = path.join(ROOT, 'videos', 'scenes');
const NARRATION = path.join(ROOT, 'media', 'narration');
const AUDIO = path.join(ROOT, 'media', 'audio');
const OUT = path.join(ROOT, 'media', 'video');
const BUILD = path.join(ROOT, 'build', 'manim');
const QUALITY = { l: ['-ql', '480p15'], m: ['-qm', '720p30'], h: ['-qh', '1080p60'] };

function parseArgs(argv) {
  const opts = { only: [], quality: 'm', manifestOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only') opts.only.push(...argv[++i].split(',').filter(Boolean));
    else if (a === '--quality') opts.quality = argv[++i];
    else if (a === '--manifest-only') opts.manifestOnly = true;
    else { console.error(`Unknown argument: ${a}`); process.exit(2); }
  }
  if (!QUALITY[opts.quality]) { console.error('--quality must be l, m or h'); process.exit(2); }
  return opts;
}

function findManim() {
  const candidates = [process.env.MANIM, path.join(os.homedir(), '.venvs', 'manim', 'bin', 'manim'), 'manim'].filter(Boolean);
  for (const c of candidates) {
    const r = spawnSync(c, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  console.error('manim not found. Install it (see README "Videos") or set MANIM=/path/to/manim.');
  process.exit(1);
}

function probe(file, entries) {
  const r = spawnSync('ffprobe', ['-v', 'error', ...entries, '-of', 'json', file], { encoding: 'utf8' });
  return r.status === 0 ? JSON.parse(r.stdout) : null;
}
const duration = (file) => Number(probe(file, ['-show_entries', 'format=duration'])?.format?.duration || 0);
const hasAudio = (file) => (probe(file, ['-select_streams', 'a', '-show_entries', 'stream=index'])?.streams || []).length > 0;

function mixMusic(video, music) {
  const tmp = video.replace(/\.mp4$/, '.mixing.mp4');
  const withVoice = hasAudio(video);
  const seconds = Number(probe(video, ['-select_streams', 'v', '-show_entries', 'stream=duration'])?.streams?.[0]?.duration || duration(video));
  const fadeOut = Math.max(0, seconds - 2).toFixed(2);
  const filter = withVoice
    ? `[0:a]apad[v];[1:a]volume=0.16,afade=t=in:d=1.5,afade=t=out:st=${fadeOut}:d=2[m];[v][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`
    : `[1:a]volume=0.35,afade=t=in:d=1.5,afade=t=out:st=${fadeOut}:d=2[a]`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-stream_loop', '-1', '-i', music,
    '-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', seconds.toFixed(3), tmp], { stdio: 'inherit' });
  if (r.status === 0) fs.renameSync(tmp, video);
  else console.error(`  music mix failed for ${path.basename(video)}; keeping the unmixed video`);
}

function render(manim, id, quality) {
  const [flag, folder] = QUALITY[quality];
  console.log(`\n▶ ${id} (${folder})`);
  const r = spawnSync(manim, [flag, '--disable_caching', '--media_dir', BUILD, '-o', id, path.join(SCENES, `${id}.py`), 'Main'],
    { stdio: 'inherit', cwd: ROOT, env: { ...process.env, PYTHONPATH: [path.join(ROOT, 'videos'), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter) } });
  if (r.status !== 0) { console.error(`  ✗ manim failed for ${id}`); return false; }
  const produced = path.join(BUILD, 'videos', id, folder, `${id}.mp4`);
  if (!fs.existsSync(produced)) { console.error(`  ✗ expected output missing: ${produced}`); return false; }
  fs.mkdirSync(OUT, { recursive: true });
  const dest = path.join(OUT, `${id}.mp4`);
  fs.copyFileSync(produced, dest);
  const music = path.join(AUDIO, 'videos', id, 'music.mp3');
  if (fs.existsSync(music)) mixMusic(dest, music);
  console.log(`  ✓ ${path.relative(ROOT, dest)} (${duration(dest).toFixed(1)}s)`);
  return true;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeManifest() {
  const videos = [];
  const sceneIds = fs.existsSync(SCENES) ? fs.readdirSync(SCENES).filter((f) => f.endsWith('.py')).map((f) => f.slice(0, -3)).sort() : [];
  for (const id of sceneIds) {
    const n = readJson(path.join(NARRATION, 'videos', `${id}.json`)) || {};
    const file = path.join(OUT, `${id}.mp4`);
    if (!fs.existsSync(file)) continue;
    const segs = (n.segments || []).map((s) => s.id);
    videos.push({
      id, title: n.title || id, summary: n.summary || '', station: n.station || null,
      src: `media/video/${id}.mp4`,
      captions: fs.existsSync(path.join(OUT, `${id}.vtt`)) ? `media/video/${id}.vtt` : null,
      seconds: Math.round(duration(file)),
      narrated: hasAudio(file) && segs.length > 0 && segs.every((s) => fs.existsSync(path.join(AUDIO, 'videos', id, `${s}.mp3`))),
      music: fs.existsSync(path.join(AUDIO, 'videos', id, 'music.mp3')),
    });
  }
  // Narration clips for the HTML stations: media/audio/site/<station>/<segment>.mp3
  const site = {};
  const siteNarr = path.join(NARRATION, 'site');
  if (fs.existsSync(siteNarr)) {
    for (const f of fs.readdirSync(siteNarr).filter((x) => x.endsWith('.json')).sort()) {
      const n = readJson(path.join(siteNarr, f));
      if (!n) continue;
      const station = f.slice(0, -5);
      const clips = (n.segments || []).map((s) => ({ id: s.id, text: s.text, src: `media/audio/site/${station}/${s.id}.mp3` }))
        .filter((c) => fs.existsSync(path.join(ROOT, c.src)));
      site[station] = { title: n.title || station, clips };
    }
  }
  const body = `// Generated by tools/videos/render.mjs and tools/media/generate-audio.mjs. Do not edit by hand.\n` +
    `export const VIDEOS = ${JSON.stringify(videos, null, 2)};\n\n` +
    `export const SITE_AUDIO = ${JSON.stringify(site, null, 2)};\n`;
  fs.writeFileSync(path.join(ROOT, 'media', 'manifest.js'), body);
  console.log(`\nWrote media/manifest.js (${videos.length} video(s), ${Object.keys(site).length} narrated station(s)).`);
}

export { writeManifest };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.manifestOnly) {
    const manim = findManim();
    const all = fs.existsSync(SCENES) ? fs.readdirSync(SCENES).filter((f) => f.endsWith('.py')).map((f) => f.slice(0, -3)).sort() : [];
    const ids = opts.only.length ? opts.only : all;
    if (!ids.length) console.log('No scenes in videos/scenes yet.');
    let failed = 0;
    for (const id of ids) if (!render(manim, id, opts.quality)) failed++;
    writeManifest();
    process.exit(failed ? 1 : 0);
  } else {
    writeManifest();
  }
}
