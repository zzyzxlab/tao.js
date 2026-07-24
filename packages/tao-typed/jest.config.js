// Self-contained (no jest.preset.cjs): this package is TypeScript and
// node-only; the shared preset's jsdom/react/babel setup does not apply.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageReporters: ['text', 'html'],
  transform: {
    '^.+\\.ts$': [
      require.resolve('ts-jest'),
      { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false },
    ],
  },
};
