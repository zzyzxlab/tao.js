module.exports = {
  preset: '../../jest.preset.cjs',
  // every suite loads the module via jest.isolateModules (window vs server
  // copies); jest's v8 collector keeps only one module copy per test file,
  // so istanbul instrumentation (shared counters) is accurate here
  coverageProvider: 'babel',
  testEnvironment: 'node',
};
