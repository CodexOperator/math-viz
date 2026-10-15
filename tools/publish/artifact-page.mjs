#!/usr/bin/env node
// Make the claude.ai Artifact version of the built site's index.html: the Artifact wraps the page
// in its own <!doctype>/<html>/<head>/<body>, so this keeps the <title>, stylesheets and scripts
// from <head> and the contents of <body>, and drops the wrappers and the charset/viewport metas.
//
//   node tools/publish/artifact-page.mjs build/site/index.html <out.html>

import fs from 'node:fs';

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('usage: node tools/publish/artifact-page.mjs <index.html> <out.html>'); process.exit(2); }
const html = fs.readFileSync(src, 'utf8');
const head = (html.match(/<head>([\s\S]*?)<\/head>/i) || [])[1] || '';
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [])[1] || '';
const keepHead = head
  .split('\n')
  .filter((line) => !/<meta\s+(charset|name="viewport"|name="color-scheme")/i.test(line))
  .join('\n');
fs.writeFileSync(out, `${keepHead.trim()}\n${body.trim()}\n`);
console.log(`Wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB).`);
