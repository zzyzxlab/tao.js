#!/usr/bin/env node
/*
 * Clean-room TypeScript consumer check for the release group.
 *
 * Packs every release-group package with `pnpm pack` (so the check exercises
 * the published artifact: the `files` allowlist, the `types` field, and the
 * emitted lib/*.d.ts — not the workspace layout), installs the tarballs plus
 * the host libraries into a scratch project outside the repo, and compiles
 * typical usage of every package with `tsc --noEmit` under `strict`.
 *
 * The consumer sources (./src) carry IsAny type assertions on the key
 * published types, so a declaration degrading to `any` fails the build even
 * where skipLibCheck would hide the underlying resolution error.
 *
 * Run after a full `pnpm build`:  pnpm run test:types
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

// npm name -> workspace directory (the 13-package fixed release group)
const PACKAGES = {
  '@tao.js/core': 'packages/tao',
  '@tao.js/utils': 'packages/tao-utils',
  '@tao.js/react': 'packages/react-tao',
  '@tao.js/router': 'packages/tao-router',
  '@tao.js/socket.io': 'packages/tao-socket-io',
  '@tao.js/koa': 'packages/koa-tao',
  '@tao.js/telemetry': 'packages/tao-telemetry',
  '@tao.js/opentelemetry': 'packages/tao-opentelemetry',
  '@tao.js/routing-core': 'packages/tao-routing-core',
  '@tao.js/routing-react-router': 'packages/tao-routing-react-router',
  '@tao.js/routing-tanstack-router': 'packages/tao-routing-tanstack',
  '@tao.js/routing-next': 'packages/tao-routing-next',
  '@tao.js/transport-tck': 'packages/tao-transport-tck',
};

// Host libraries the packed declarations reference from consumer land.
const HOST_DEPS = {
  react: '^19.2.7',
  'react-dom': '^19.2.7',
  '@types/react': '^19.0.0',
  '@types/react-dom': '^19.0.0',
  'react-router': '^7.6.0',
  '@tanstack/react-router': '^1.120.0',
  next: '16.2.10',
  '@opentelemetry/api': '^1.9.1',
};

function run(cmd, args, opts) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts });
}

// 1. Every package must be built (rollup lib + emitted declarations).
const unbuilt = Object.entries(PACKAGES).filter(
  ([, dir]) => !fs.existsSync(path.join(ROOT, dir, 'lib', 'index.d.ts')),
);
if (unbuilt.length) {
  console.error(
    'Missing lib/index.d.ts for:\n' +
      unbuilt.map(([name]) => `  - ${name}`).join('\n') +
      '\nRun `pnpm build` first.',
  );
  process.exit(1);
}

// 2. Scratch project outside the repo (keeps pnpm workspace detection away).
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tao-types-consumer-'));
const tarballDir = path.join(work, 'tarballs');
fs.mkdirSync(tarballDir);
console.log(`clean-room consumer: ${work}`);

// 3. Pack every package.
const deps = {};
for (const [name, dir] of Object.entries(PACKAGES)) {
  const out = run('pnpm', ['pack', '--pack-destination', tarballDir], {
    cwd: path.join(ROOT, dir),
  });
  const lines = out.trim().split('\n');
  const tarball = lines[lines.length - 1].trim();
  if (!fs.existsSync(tarball)) {
    console.error(`pack of ${name} did not produce a tarball (got: ${tarball})`);
    process.exit(1);
  }
  deps[name] = `file:${tarball}`;
  console.log(`packed ${name} -> ${path.basename(tarball)}`);
}

// 4. Consumer project: package.json + tsconfig + sources.
fs.writeFileSync(
  path.join(work, 'package.json'),
  JSON.stringify(
    {
      name: 'tao-types-consumer',
      private: true,
      dependencies: { ...deps, ...HOST_DEPS },
      devDependencies: { typescript: '^5.9.3' },
    },
    null,
    2,
  ),
);
fs.copyFileSync(
  path.join(__dirname, 'tsconfig.consumer.json'),
  path.join(work, 'tsconfig.json'),
);
fs.cpSync(path.join(__dirname, 'src'), path.join(work, 'src'), {
  recursive: true,
});

// 5. Install (shared pnpm store makes this mostly offline) and compile.
run('pnpm', ['install', '--prefer-offline', '--reporter=append-only'], {
  cwd: work,
  stdio: ['ignore', 'inherit', 'inherit'],
});
try {
  run(path.join(work, 'node_modules', '.bin', 'tsc'), ['-p', '.'], {
    cwd: work,
    stdio: 'inherit',
  });
} catch {
  console.error('\ntypes consumer FAILED — see tsc errors above');
  console.error(`scratch project retained for inspection: ${work}`);
  process.exit(1);
}

console.log('\ntypes consumer OK: every package resolved with real types');
fs.rmSync(work, { recursive: true, force: true });
