#!/usr/bin/env node
// Generate narration (text to speech) and music beds for the videos and the HTML stations.
//
// Run it on a machine that can reach openrouter.ai, with the keys injected by Doppler:
//
//   doppler run --project agi --config <config> -- npm run media:audio
//
// Inputs:  media/narration/videos/<id>.json  and  media/narration/site/<station>.json
//          { "title", "voice"?, "music"?: { "prompt", "seconds" }, "segments": [ { "id", "text" } ] }
// Outputs: media/audio/<group>/<id>/<segment>.mp3, media/audio/<group>/<id>/music.mp3,
//          and an updated media/manifest.js. Clips whose text has not changed are skipped.
//
// Keys, in order of preference (only variable names are ever printed, never values):
//   OPENROUTER_API_KEY                an OpenRouter inference key, used as is
//   a provisioning (admin) key        OPENROUTER_PROVISIONING_KEY, OPENROUTER_ADMIN_KEY(_2),
//                                     ADMIN_KEY(_2), or the name given with --key-var. The script
//                                     creates a temporary inference key with a spending cap
//                                     (--limit-usd, default 5), uses it, and deletes it at the end.
//   ELEVENLABS_API_KEY                optional: call ElevenLabs directly for speech instead
//
// Flags:
//   --dry-run            list what would be generated; no network
//   --list-models        print OpenRouter models that can output audio, then exit
//   --only <id>          limit to one narration file (repeat or comma-separate)
//   --group videos|site  limit to one group
//   --force              regenerate even when the text is unchanged
//   --no-music           skip music beds
//   --tts-model <id>     OpenRouter model for speech (default: first audio model matching /eleven/)
//   --music-model <id>   OpenRouter model for music (default: first audio model matching /lyria/)
//   --voice <name|id>    voice name or ElevenLabs voice id (default: narration file "voice", then TTS_VOICE)
//   --key-var <NAME>     environment variable that holds the provisioning key
//   --limit-usd <n>      spending cap for the temporary key (default 5)
//   --narration-dir <d>  read narration from <d>/videos and <d>/site instead of media/narration (testing)
//   --audio-dir <d>      write audio under <d> instead of media/audio (testing; manifest left alone)
//   Defaults for --voice, --tts-model, --music-model, --key-var and --limit-usd can be saved in
//   media/audio-config.json.
//
// OpenRouter's audio APIs are newer than the rest of this repo and could not be exercised from
// the cloud session that wrote this script (openrouter.ai was not reachable there). The script
// therefore tries the known request shapes in turn and prints the server's error text when all
// of them fail, so the request can be adjusted quickly.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeManifest } from '../videos/render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const flagValue = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
// --narration-dir / --audio-dir point at scratch folders for testing (each holds videos/ and site/ subfolders).
const NARRATION = path.resolve(flagValue('--narration-dir') || path.join(ROOT, 'media', 'narration'));
const AUDIO = path.resolve(flagValue('--audio-dir') || path.join(ROOT, 'media', 'audio'));
const SCRATCH = NARRATION !== path.join(ROOT, 'media', 'narration') || AUDIO !== path.join(ROOT, 'media', 'audio');
const OR = 'https://openrouter.ai/api/v1';
const DEFAULT_ELEVEN_VOICE = '21m00Tcm4TlvDq8ikWAM';

// Saved choices (voice, models, cap) live in media/audio-config.json so every run sounds the same:
// { "voice": "...", "ttsModel": "...", "musicModel": "...", "limitUsd": 5, "keyVar": "..." }
const CONFIG = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'media', 'audio-config.json'), 'utf8')); } catch { return {}; } })();

function parseArgs(argv) {
  const o = { dryRun: false, listModels: false, only: [], group: null, force: false, music: true,
    ttsModel: process.env.TTS_MODEL || CONFIG.ttsModel || null, musicModel: process.env.MUSIC_MODEL || CONFIG.musicModel || null,
    voice: process.env.TTS_VOICE || CONFIG.voice || null, keyVar: CONFIG.keyVar || null, limitUsd: CONFIG.limitUsd || 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--list-models') o.listModels = true;
    else if (a === '--only') o.only.push(...argv[++i].split(',').filter(Boolean));
    else if (a === '--group') o.group = argv[++i];
    else if (a === '--force') o.force = true;
    else if (a === '--no-music') o.music = false;
    else if (a === '--tts-model') o.ttsModel = argv[++i];
    else if (a === '--music-model') o.musicModel = argv[++i];
    else if (a === '--voice') o.voice = argv[++i];
    else if (a === '--key-var') o.keyVar = argv[++i];
    else if (a === '--limit-usd') o.limitUsd = Number(argv[++i]);
    else if (a === '--narration-dir' || a === '--audio-dir') i++;
    else { console.error(`Unknown argument: ${a}`); process.exit(2); }
  }
  return o;
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f, fallback = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };

// ---------- work list ----------
function collectJobs(o) {
  const jobs = [];
  for (const group of ['videos', 'site']) {
    if (o.group && o.group !== group) continue;
    const dir = path.join(NARRATION, group);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('_')).sort()) {
      const id = f.slice(0, -5);
      if (o.only.length && !o.only.includes(id)) continue;
      const n = readJson(path.join(dir, f));
      if (!n) { console.warn(`skipping unreadable ${group}/${f}`); continue; }
      const outDir = path.join(AUDIO, group, id);
      const hashes = readJson(path.join(outDir, '.hashes.json'), {});
      for (const seg of n.segments || []) {
        const file = path.join(outDir, `${seg.id}.mp3`);
        const h = sha(`${n.voice || ''}|${seg.text}`);
        if (!o.force && fs.existsSync(file) && hashes[seg.id] === h) continue;
        jobs.push({ kind: 'speech', group, id, seg: seg.id, text: seg.text, voice: o.voice || n.voice || null, file, outDir, hash: h });
      }
      if (o.music && n.music && n.music.prompt) {
        const file = path.join(outDir, 'music.mp3');
        const h = sha(`${n.music.prompt}|${n.music.seconds || ''}`);
        if (o.force || !fs.existsSync(file) || hashes.music !== h) {
          jobs.push({ kind: 'music', group, id, seg: 'music', text: n.music.prompt, seconds: n.music.seconds || 60, file, outDir, hash: h });
        }
      }
    }
  }
  return jobs;
}

// ---------- HTTP helpers ----------
async function request(url, init, label, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try { res = await fetch(url, init); } catch (e) {
      if (attempt >= tries) throw new Error(`${label}: network error ${e.message}`);
      await sleep(1000 * 2 ** attempt); continue;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < tries) { await sleep(1000 * 2 ** attempt); continue; }
    return res;
  }
}

async function errorText(res) {
  const t = await res.text().catch(() => '');
  return `HTTP ${res.status}: ${t.slice(0, 400)}`;
}

// ---------- keys ----------
function provisioningCandidates(o) {
  if (o.keyVar) return process.env[o.keyVar] ? [o.keyVar] : [];
  const preferred = ['OPENROUTER_PROVISIONING_KEY', 'OPENROUTER_ADMIN_KEY', 'OPENROUTER_ADMIN_KEY_2', 'ADMIN_KEY', 'ADMIN_KEY_2'];
  const pattern = /^(OPENROUTER.*(ADMIN|PROVISION)|ADMIN_KEY)/i;
  const names = [...preferred, ...Object.keys(process.env).filter((k) => pattern.test(k)).sort()];
  return [...new Set(names)].filter((k) => process.env[k]);
}

async function createTempKey(o) {
  for (const name of provisioningCandidates(o)) {
    const res = await request(`${OR}/keys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env[name]}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `math-viz media ${new Date().toISOString().slice(0, 16)}`, limit: o.limitUsd }),
    }, 'create key');
    if (res.ok) {
      const body = await res.json();
      const key = body.key, hash = body.data?.hash;
      if (key) { console.log(`Created a temporary OpenRouter key from ${name} (cap $${o.limitUsd}).`); return { key, hash, from: name }; }
    }
    console.warn(`  ${name} could not create a key (${res.status}); trying the next one.`);
  }
  return null;
}

async function deleteTempKey(temp) {
  if (!temp?.hash) return;
  const res = await request(`${OR}/keys/${temp.hash}`, { method: 'DELETE', headers: { Authorization: `Bearer ${process.env[temp.from]}` } }, 'delete key');
  console.log(res.ok ? 'Deleted the temporary OpenRouter key.' : `Could not delete the temporary key (${res.status}); remove "math-viz media" keys in the OpenRouter dashboard.`);
}

// ---------- models ----------
async function audioModels() {
  const res = await request(`${OR}/models`, {}, 'list models');
  if (!res.ok) throw new Error(`list models: ${await errorText(res)}`);
  const { data } = await res.json();
  return data.filter((m) => (m.architecture?.output_modalities || []).includes('audio'));
}

// ---------- audio extraction ----------
function findBase64Audio(node, depth = 0) {
  if (!node || depth > 8) return null;
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && v.length > 800 && /^(data|audio|b64_json|b64|base64)$/i.test(k) && /^[A-Za-z0-9+/=\s]+$/.test(v.slice(0, 200))) {
        return { b64: v, format: node.format || node.mime_type || null };
      }
      if (typeof v === 'string' && /^https?:\/\/\S+\.(mp3|wav|ogg|flac|m4a)(\?\S*)?$/i.test(v)) return { url: v };
      const inner = findBase64Audio(v, depth + 1);
      if (inner) return inner;
    }
  }
  return null;
}

function toMp3(buffer, file, format) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = `${file}.raw`;
  fs.writeFileSync(raw, buffer);
  const input = /pcm/i.test(format || '') ? ['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw] : ['-i', raw];
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...input, '-c:a', 'libmp3lame', '-b:a', '128k', file], { stdio: 'inherit' });
  fs.rmSync(raw, { force: true });
  if (r.status !== 0) throw new Error(`ffmpeg could not convert the returned audio (${format || 'unknown format'})`);
}

async function readSse(res) {
  const text = await res.text();
  let b64 = '', format = null, transcript = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const j = JSON.parse(payload);
      const audio = j.choices?.[0]?.delta?.audio;
      if (audio?.data) b64 += audio.data;
      if (audio?.format) format = audio.format;
      if (audio?.transcript) transcript += audio.transcript;
    } catch {}
  }
  return b64 ? { b64, format, transcript } : null;
}

// Try the request shapes OpenRouter uses for audio output; remember the one that works.
const winningShape = { speech: null, music: null };
async function openrouterAudio(kind, key, model, text, extra) {
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://github.com/codexoperator/math-viz', 'X-Title': 'math-viz' };
  // Speech goes through chat audio models, which answer a prompt unless told to read it verbatim.
  const prompt = kind === 'music' ? `${text}\nInstrumental, about ${extra.seconds} seconds, no vocals.` : `Read the following text aloud exactly as written, word for word, in a warm, clear, unhurried voice. Do not add, remove or change anything.\n\n${text}`;
  const shapes = {
    speech_endpoint: () => request(`${OR}/audio/speech`, { method: 'POST', headers, body: JSON.stringify({ model, input: prompt, voice: extra.voice || undefined, response_format: 'mp3' }) }, kind),
    chat: () => request(`${OR}/chat/completions`, { method: 'POST', headers, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], modalities: ['audio'], audio: { voice: extra.voice || undefined, format: 'mp3' } }) }, kind),
    chat_text_audio: () => request(`${OR}/chat/completions`, { method: 'POST', headers, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], modalities: ['text', 'audio'], audio: { voice: extra.voice || undefined, format: 'mp3' } }) }, kind),
    chat_stream: () => request(`${OR}/chat/completions`, { method: 'POST', headers, body: JSON.stringify({ model, stream: true, messages: [{ role: 'user', content: prompt }], modalities: ['text', 'audio'], audio: { voice: extra.voice || undefined, format: 'pcm16' } }) }, kind),
  };
  // OpenRouter documents speech output as streaming-only (chat/completions, stream: true), so speech tries that first.
  // Music (Lyria) worked with the original order, so it keeps it.
  const all = Object.keys(shapes);
  const order = winningShape[kind] ? [winningShape[kind]] : kind === 'speech' ? ['chat_stream', ...all.filter((k) => k !== 'chat_stream')] : all;
  const errors = [];
  for (const name of order) {
    const res = await shapes[name]();
    if (!res.ok) { errors.push(`${name}: ${await errorText(res)}`); continue; }
    const type = res.headers.get('content-type') || '';
    let found = null;
    if (type.startsWith('audio/') || type === 'application/octet-stream') {
      found = { buffer: Buffer.from(await res.arrayBuffer()), format: type.split('/')[1] };
    } else if (type.includes('text/event-stream')) {
      const s = await readSse(res);
      // The stream request asks for pcm16; OpenRouter does not always echo the format back.
      if (s) found = { buffer: Buffer.from(s.b64, 'base64'), format: s.format || (name === 'chat_stream' ? 'pcm16' : null) };
      if (s?.transcript) console.log(`    transcript: ${s.transcript.slice(0, 300)}`);
      if (!s) errors.push(`${name}: stream had no audio`);
    } else {
      const body = await res.json().catch(() => null);
      const hit = findBase64Audio(body);
      if (hit?.b64) found = { buffer: Buffer.from(hit.b64, 'base64'), format: hit.format };
      else if (hit?.url) { const a = await request(hit.url, {}, 'download'); if (a.ok) found = { buffer: Buffer.from(await a.arrayBuffer()), format: null }; }
      else errors.push(`${name}: response had no audio (${JSON.stringify(body).slice(0, 300)})`);
    }
    if (found) { winningShape[kind] = name; return found; }
  }
  throw new Error(`${kind} with ${model} failed:\n    ${errors.join('\n    ')}`);
}

async function elevenlabsSpeech(text, voice) {
  const id = voice && /^[A-Za-z0-9]{20}$/.test(voice) ? voice : DEFAULT_ELEVEN_VOICE;
  const res = await request(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  }, 'elevenlabs');
  if (!res.ok) throw new Error(`ElevenLabs: ${await errorText(res)}`);
  return { buffer: Buffer.from(await res.arrayBuffer()), format: 'mp3' };
}

// ---------- main ----------
async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.listModels) {
    for (const m of await audioModels()) console.log(`${m.id}\t in: ${(m.architecture.input_modalities || []).join(',')}\t ${m.name}`);
    return;
  }
  const jobs = collectJobs(o);
  console.log(`${jobs.length} clip(s) to generate.`);
  for (const j of jobs) console.log(`  ${j.kind.padEnd(6)} ${j.group}/${j.id}/${j.seg}  "${j.text.slice(0, 70)}${j.text.length > 70 ? '…' : ''}"`);
  if (o.dryRun || !jobs.length) { if (!o.dryRun && !SCRATCH) writeManifest(); return; }

  let temp = null, key = process.env.OPENROUTER_API_KEY || null;
  const needOpenRouter = jobs.some((j) => j.kind === 'music') || (jobs.some((j) => j.kind === 'speech') && !process.env.ELEVENLABS_API_KEY);
  try {
    if (needOpenRouter && !key) {
      temp = await createTempKey(o);
      if (!temp) throw new Error('No OpenRouter key available. Set OPENROUTER_API_KEY, or a provisioning key (see the header of this file), e.g. via `doppler run --project agi --config <config> --`.');
      key = temp.key;
    }
    let ttsModel = o.ttsModel, musicModel = o.musicModel;
    if (needOpenRouter && (!ttsModel || !musicModel)) {
      const models = await audioModels();
      ttsModel ||= models.find((m) => /eleven/i.test(m.id))?.id || null;
      musicModel ||= models.find((m) => /lyria/i.test(m.id))?.id || null;
      console.log(`Speech model: ${process.env.ELEVENLABS_API_KEY ? 'ElevenLabs API (direct)' : ttsModel || 'none found'}; music model: ${musicModel || 'none found'}`);
    }
    let made = 0, failed = 0;
    for (const j of jobs) {
      try {
        let out;
        if (j.kind === 'speech') {
          if (process.env.ELEVENLABS_API_KEY) out = await elevenlabsSpeech(j.text, j.voice);
          else if (ttsModel) out = await openrouterAudio('speech', key, ttsModel, j.text, { voice: j.voice });
          else throw new Error('no speech model; pass --tts-model (see --list-models)');
        } else {
          if (!musicModel) throw new Error('no music model; pass --music-model (see --list-models)');
          out = await openrouterAudio('music', key, musicModel, j.text, { seconds: j.seconds });
        }
        toMp3(out.buffer, j.file, out.format);
        const hashFile = path.join(j.outDir, '.hashes.json');
        const hashes = readJson(hashFile, {});
        hashes[j.seg] = j.hash;
        fs.writeFileSync(hashFile, JSON.stringify(hashes, null, 2));
        made++;
        console.log(`  ✓ ${path.relative(ROOT, j.file)}`);
      } catch (e) {
        failed++;
        console.error(`  ✗ ${j.group}/${j.id}/${j.seg}: ${e.message}`);
        if (failed >= 3 && made === 0) { console.error('Stopping after three failures in a row with nothing generated.'); break; }
      }
    }
    console.log(`\n${made} generated, ${failed} failed.`);
    if (!SCRATCH) writeManifest();
    if (failed) process.exitCode = 1;
  } finally {
    await deleteTempKey(temp);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
