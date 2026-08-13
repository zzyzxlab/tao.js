#!/usr/bin/env node
/**
 * Deep-link maintainer for the root spec/doc set (TAO-SPEC.md, MESH-SPEC.md,
 * ENVELOPE-SPEC.md, VISION.md, AGENTIC.md, AGENTS.md, FUTURE.md, README.md, …
 * — every root-level .md is auto-discovered).
 *
 * Cross-doc section references are written as deep links to GitHub heading
 * anchors: [`MESH-SPEC.md` §3](./MESH-SPEC.md#3-the-space-and-the-apps-tao).
 * Anchors derive from heading text, so a heading reword breaks its inbound
 * links silently (GitHub falls back to top-of-file). This tool keeps that
 * honest:
 *
 *   node tools/docs/link-spec-sections.mjs --check   # lint: verify every
 *       relative .md link and #anchor across the root docs resolves to a
 *       real file + current heading; exit 1 listing any that don't.
 *
 *   node tools/docs/link-spec-sections.mjs --write   # rewrite plain
 *       references of the form [`DOC.md`](./DOC.md) §N into deep links
 *       using the current headings (idempotent — already-deep links are
 *       left alone).
 *
 * Run --check after renaming or adding headings; run --write after adding
 * new plain § references. Section-numbered headings ("## 3. The phase
 * contract") are the convention that keeps anchors stable — renumber or
 * reword one and --check names every inbound link to fix.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const mode = process.argv.includes('--write') ? 'write' : 'check';

const docs = fs
  .readdirSync(root)
  .filter((f) => f.endsWith('.md'))
  .sort();

// GitHub anchor slug: lowercase; strip all but letters, numbers, spaces,
// hyphens, underscores; spaces -> hyphens. (Duplicate headings would get
// -1/-2 suffixes on GitHub; the root docs avoid duplicate headings.)
const slug = (h) =>
  h
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/ /g, '-');

// Per-doc: all heading slugs, plus section-number -> slug for §N lookup
const anchors = {};
const byNumber = {};
for (const doc of docs) {
  const text = fs.readFileSync(path.join(root, doc), 'utf8');
  anchors[doc] = new Set();
  byNumber[doc] = {};
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (!m) continue;
    const s = slug(m[1]);
    anchors[doc].add(s);
    const num = m[1].match(/^([0-9]+(?:\.[0-9]+)?)[.\s]/);
    if (num) {
      const key = num[1].replace(/\.$/, '');
      if (!(key in byNumber[doc])) byNumber[doc][key] = s;
    }
  }
}

let failures = [];
let rewrites = 0;

for (const doc of docs) {
  const file = path.join(root, doc);
  let text = fs.readFileSync(file, 'utf8');

  if (mode === 'write') {
    // [`DOC.md`](./DOC.md) §N[.M][–N] -> deep link (leaves deep links alone:
    // the pattern requires the target to have no #fragment)
    const REF =
      /\[`([A-Za-z0-9._-]+\.md)`\]\(\.\/\1\)(\s+)(§§?[0-9]+(?:\.[0-9]+)?(?:[–-][0-9]+(?:\.[0-9]+)?)?)/g;
    const rewritten = text.replace(REF, (whole, target, _ws, sec) => {
      const first = sec.match(/[0-9]+(?:\.[0-9]+)?/)[0];
      const map = byNumber[target] || {};
      const anchor = map[first] || map[first.split('.')[0]];
      if (!anchor) {
        failures.push(`${doc}: no heading for ${target} ${sec}`);
        return whole;
      }
      rewrites++;
      return `[\`${target}\` ${sec}](./${target}#${anchor})`;
    });
    if (rewritten !== text) {
      text = rewritten;
      fs.writeFileSync(file, text);
    }
  }

  // Verify every relative .md link (with or without anchor) and self-anchor
  for (const m of text.matchAll(
    /\]\((?:\.\/)?([A-Za-z0-9._/-]+\.md)(#([A-Za-z0-9-]+))?\)/g,
  )) {
    const [, target, , anchor] = m;
    const base = path.basename(target);
    if (!fs.existsSync(path.join(root, target))) {
      failures.push(`${doc}: broken file link ${target}`);
    } else if (anchor && anchors[base] && !anchors[base].has(anchor)) {
      failures.push(`${doc}: broken anchor ${target}#${anchor}`);
    }
  }
  for (const m of text.matchAll(/\]\(#([A-Za-z0-9-]+)\)/g)) {
    if (!anchors[doc].has(m[1])) {
      failures.push(`${doc}: broken self-anchor #${m[1]}`);
    }
  }
}

if (mode === 'write') console.log(`rewrote ${rewrites} reference(s)`);
if (failures.length) {
  console.error(`${failures.length} broken link(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`all relative doc links resolve (${docs.length} docs checked)`);
