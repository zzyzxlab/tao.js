module.exports = {
  preset: '../../jest.preset.cjs',
  // Explicit for Stryker perTest (presets are not merged for testEnvironment).
  testEnvironment: 'jsdom',
  // This package's index is a pure export barrel; each export is covered directly.
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
};
