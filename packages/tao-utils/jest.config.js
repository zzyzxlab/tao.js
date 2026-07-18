module.exports = {
  preset: '../../jest.preset.cjs',
  // This package's index is a pure export barrel; each export is covered directly.
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  // Redundant barrel-export assertions are covered by the public-export test.
  testPathIgnorePatterns: ['<rootDir>/test/tao-utils.spec.js'],
};
