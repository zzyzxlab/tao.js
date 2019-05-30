import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import external from 'rollup-plugin-peer-deps-external';
import pkg from './package.json';

export default [
  // browser-friendly UMD build for current API
  {
    input: 'src/index.js',
    output: {
      name: 'taoReact',
      file: pkg.bundles.browser,
      format: 'umd',
      sourcemap: true,
      exports: 'named',
      globals: {
        react: 'React',
        'prop-types': 'PropTypes',
        '@tao.js/core': 'tao'
        // cartesian: 'cartesian'
      }
    },
    // external: ['cartesian'],
    plugins: [
      external(),
      babel({
        runtimeHelpers: true,
        exclude: ['node_modules/**']
      }),
      resolve(),
      commonjs({
        // namedExports: {
        //   react: ['Component', 'Fragment', 'createContext']
        // }
        // // include: ['node_modules/react']
      })
    ]
  },
  // browser-friendly UMD build for original API
  {
    input: 'src/orig.js',
    output: {
      name: 'taoReactOrig',
      file: pkg.bundles.orig,
      format: 'umd',
      sourcemap: true,
      exports: 'named',
      globals: {
        react: 'React',
        'prop-types': 'PropTypes',
        '@tao.js/core': 'tao'
        // cartesian: 'cartesian'
      }
    },
    // external: ['cartesian'],
    plugins: [
      external(),
      babel({
        runtimeHelpers: true,
        exclude: ['node_modules/**']
      }),
      resolve(),
      commonjs({
        // namedExports: {
        //   react: ['Component', 'Fragment', 'createContext']
        // }
        // // include: ['node_modules/react']
      })
    ]
  },
  // browser-friendly UMD build for entire API (current + original)
  {
    input: 'src/all.js',
    output: {
      name: 'taoReactAll',
      file: pkg.bundles.all,
      format: 'umd',
      sourcemap: true,
      exports: 'named',
      globals: {
        react: 'React',
        'prop-types': 'PropTypes',
        '@tao.js/core': 'tao'
        // cartesian: 'cartesian'
      }
    },
    // external: ['cartesian'],
    plugins: [
      external(),
      babel({
        runtimeHelpers: true,
        exclude: ['node_modules/**']
      }),
      resolve(),
      commonjs({
        // namedExports: {
        //   react: ['Component', 'Fragment', 'createContext']
        // }
        // // include: ['node_modules/react']
      })
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
      index: 'src/all.js',
      // index: 'src/index.js',
      // orig: 'src/orig.js',
      Provider: 'src/Provider.js',
      RenderHandler: 'src/RenderHandler.js',
      SwitchHandler: 'src/SwitchHandler.js',
      withContext: 'src/withContext.js',
      DataHandler: 'src/DataHandler.js',
      Adapter: 'src/Adapter.js',
      Reactor: 'src/Reactor.js'
    },
    output: [
      // {
      //   dir: pkg.main,
      //   entryFileNames: '[name].js',
      //   // file: pkg.main,
      //   format: 'cjs',
      //   sourcemap: true
      // },
      {
        dir: pkg.module,
        // entryFileNames: '[name].[format].js',
        entryFileNames: '[name].js',
        // chunkFileNames: '[name]-[hash].[format].js',
        chunkFileNames: '[name]-[hash].js',
        // file: pkg.module,
        format: 'esm',
        sourcemap: true
      }
    ],
    external: ['cartesian'],
    plugins: [
      external(),
      babel({
        runtimeHelpers: true,
        exclude: ['node_modules/**']
      }),
      resolve(),
      commonjs()
    ]
  },
  {
    input: {
      index: 'src/index.js',
      // orig: 'src/orig.js',
      Provider: 'src/Provider.js',
      RenderHandler: 'src/RenderHandler.js',
      SwitchHandler: 'src/SwitchHandler.js',
      withContext: 'src/withContext.js',
      DataHandler: 'src/DataHandler.js'
      // Adapter: 'src/Adapter.js',
      // Reactor: 'src/Reactor.js'
    },
    output: [
      {
        dir: pkg.main,
        entryFileNames: '[name].js',
        // file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      }
      // {
      //   dir: pkg.module,
      //   // entryFileNames: '[name].[format].js',
      //   entryFileNames: '[name].js',
      //   // chunkFileNames: '[name]-[hash].[format].js',
      //   chunkFileNames: '[name]-[hash].js',
      //   // file: pkg.module,
      //   format: 'esm',
      //   sourcemap: true
      // }
    ],
    external: ['cartesian'],
    plugins: [
      external(),
      babel({
        runtimeHelpers: true,
        exclude: ['node_modules/**']
      }),
      resolve(),
      commonjs()
    ]
  },
  {
    input: {
      // index: 'src/index.js',
      index: 'src/orig.js',
      // Provider: 'src/Provider.js',
      // RenderHandler: 'src/RenderHandler.js',
      // SwitchHandler: 'src/SwitchHandler.js',
      // withContext: 'src/withContext.js',
      // DataHandler: 'src/DataHandler.js',
      Adapter: 'src/Adapter.js',
      Reactor: 'src/Reactor.js'
    },
    output: [
      {
        dir: pkg.orig,
        entryFileNames: '[name].js',
        // file: pkg.main,
        format: 'cjs',
        sourcemap: true
      }
      // {
      //   dir: pkg.module,
      //   // entryFileNames: '[name].[format].js',
      //   entryFileNames: '[name].js',
      //   // chunkFileNames: '[name]-[hash].[format].js',
      //   chunkFileNames: '[name]-[hash].js',
      //   // file: pkg.module,
      //   format: 'esm',
      //   sourcemap: true
      // }
    ],
    external: ['cartesian'],
    plugins: [
      external(),
      babel({
        runtimeHelpers: true,
        exclude: ['node_modules/**']
      }),
      resolve(),
      commonjs()
    ]
  }
];
