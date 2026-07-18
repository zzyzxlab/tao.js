module.exports = {
  preset: '../../jest.preset.cjs',
  // Explicit for Stryker perTest (presets are not merged for testEnvironment).
  testEnvironment: 'node',
};
