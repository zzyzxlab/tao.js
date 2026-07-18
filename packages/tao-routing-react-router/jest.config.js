const path = require('path');

const rootReact = path.resolve(__dirname, '../../node_modules/react');
const rootReactDom = path.resolve(__dirname, '../../node_modules/react-dom');

module.exports = {
  preset: '../../jest.preset.cjs',
  testEnvironment: 'jsdom',
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  moduleNameMapper: {
    '^react$': rootReact,
    '^react-dom$': rootReactDom,
  },
};
