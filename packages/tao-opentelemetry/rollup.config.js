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
      name: 'tao.opentelemetry',
      file: pkg.bundles.browser,
      format: 'umd',
      sourcemap: true,
      exports: 'named',
      globals: {
        '@opentelemetry/api': 'opentelemetry',
      },
    },
    external: ['@opentelemetry/api'],
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
    external: ['@opentelemetry/api'],
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
