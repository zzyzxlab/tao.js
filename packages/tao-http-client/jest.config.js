module.exports = {
  preset: '../../jest.preset.cjs',
  // This package's index is an export barrel; the public client is tested directly.
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
};
