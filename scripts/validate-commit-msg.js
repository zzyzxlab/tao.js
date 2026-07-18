#!/usr/bin/env node

/**
 * Validates commit messages against this repo's Commitizen-compatible format.
 * Used by .husky/commit-msg so agents (and `git commit -m`) can commit
 * without the interactive wizard, while still matching changelog conventions.
 *
 * Expected shape:
 *   type(scope): subject
 *
 *   optional body
 *
 *   Affected packages:
 *   - @tao.js/core
 *   - docs
 *
 *   optional ISSUES CLOSED / BREAKING CHANGE / trailer lines
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
];

const HEADER_RE = new RegExp(
  `^(${TYPES.join('|')})(\\([a-zA-Z0-9._/@-]+\\))?!?: .+`,
);

function listWorkspacePackages() {
  const names = new Set();

  for (const dir of ['packages', 'examples']) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;

    for (const entry of fs.readdirSync(base)) {
      const pkgJsonPath = path.join(base, entry, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) continue;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if (pkg.name) names.add(pkg.name);
      } catch {
        names.add(entry);
      }
    }
  }

  return names;
}

function usageAndFail(message) {
  console.error(`commit-msg: ${message}`);
  console.error(`
Expected format (same as \`pnpm run commit\` / Commitizen):

  type(scope): subject

  Longer description (optional).

  Affected packages:
  - @tao.js/core
  - docs

Types: ${TYPES.join(', ')}
Scope is optional. List workspace package names under Affected packages
(omit bullets for root-only tooling/docs changes).
`);
  process.exit(1);
}

function main() {
  const file = process.argv[2];
  if (!file) {
    usageAndFail('missing path to COMMIT_EDITMSG');
  }

  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.replace(/\s+$/, ''));

  // Drop trailing blank lines for parsing; keep structure otherwise
  while (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const msg = lines.join('\n').trim();
  if (!msg) {
    usageAndFail('empty commit message');
  }

  if (/^Merge /i.test(msg) || /^Revert /i.test(msg)) {
    process.exit(0);
  }

  const header = lines[0];

  // Nx Release machine commits: chore(release): publish {version}
  if (/^chore\(release\): /.test(header)) {
    process.exit(0);
  }

  if (!HEADER_RE.test(header)) {
    usageAndFail(
      `invalid header "${header}". Use type(scope): subject (conventional commits).`,
    );
  }

  const affectedIdx = lines.findIndex((line) => line === 'Affected packages:');
  if (affectedIdx === -1) {
    usageAndFail('missing "Affected packages:" section');
  }

  const known = listWorkspacePackages();
  const bullets = [];
  for (let i = affectedIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') break;
    if (/^(ISSUES CLOSED:|BREAKING CHANGE:|[A-Z][\w-]+:)/.test(line)) break;
    if (!line.startsWith('- ')) {
      usageAndFail(
        `unexpected line under Affected packages: "${line}" (expected "- <package>")`,
      );
    }
    bullets.push(line.slice(2).trim());
  }

  const unknown = bullets.filter((name) => name && !known.has(name));
  if (unknown.length) {
    usageAndFail(
      `unknown package(s): ${unknown.join(', ')}\nKnown: ${[...known].sort().join(', ')}`,
    );
  }
}

main();
