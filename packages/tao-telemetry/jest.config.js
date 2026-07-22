module.exports = {
  preset: '../../jest.preset.cjs',
  // the v8 provider misreports through this package's transforms - istanbul is accurate here
  coverageProvider: 'babel',
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
};
