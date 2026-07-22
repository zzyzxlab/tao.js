import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import external from 'rollup-plugin-peer-deps-external';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

export default [
  // browser-friendly UMD build
  {
    input: 'src/index.js',
    output: {
      name: 'tao.telemetry',
      file: pkg.bundles.browser,
      format: 'umd',
      sourcemap: true,
      exports: 'named',
      globals: {
        '@tao.js/core': 'tao',
      },
    },
    external: ['@tao.js/core'],
    plugins: [
      external(),
      babel({
        babelHelpers: 'bundled',
        exclude: ['node_modules/**'],
      }),
      nodeResolve(),
      commonjs(),
    ],
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  {
    input: {
      index: 'src/index.js',
    },
    output: [
      {
        dir: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        dir: pkg.module,
        format: 'esm',
        sourcemap: true,
        exports: 'named',
      },
    ],
    external: ['@tao.js/core'],
    plugins: [
      external(),
      babel({
        babelHelpers: 'bundled',
        exclude: ['node_modules/**'],
      }),
      nodeResolve(),
      commonjs(),
    ],
  },
];
