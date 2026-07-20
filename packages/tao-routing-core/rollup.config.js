import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import external from 'rollup-plugin-peer-deps-external';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

export default [
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
