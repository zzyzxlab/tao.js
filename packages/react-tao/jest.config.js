const path = require('path');

// pnpm nests a separate react via this package's `file:../../node_modules/react`
// peer link, which breaks hooks under react-test-renderer / Testing Library.
const rootReact = path.resolve(__dirname, '../../node_modules/react');
const rootReactDom = path.resolve(__dirname, '../../node_modules/react-dom');

module.exports = {
  preset: '../../jest.preset.cjs',
  moduleNameMapper: {
    '^react$': rootReact,
    '^react-dom$': rootReactDom,
  },
};
