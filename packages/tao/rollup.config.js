import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import pkg from './package.json';

export default [
  // browser-friendly UMD build
  {
    input: 'src/index.js',
    output: {
      name: 'tao',
      file: pkg.bundles.browser,
      format: 'umd',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      babel({
        runtimeHelpers: true,
        exclude: ['node_modules/**']
      }),
      globals(), // used for clearTimeout in node.js
      builtins(),
      resolve(),
      commonjs()
    ]
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: {
      index: 'src/index.js'
    },
    output: [
      {
        dir: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        dir: pkg.module,
        format: 'esm',
        sourcemap: true,
        exports: 'named'
      }
    ],
    plugins: [
      babel({
        runtimeHelpers: true,
        exclude: ['node_modules/**']
      }),
      globals(),
      builtins(),
      resolve(),
      commonjs()
    ]
  }
];
