module.exports = {
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
};
