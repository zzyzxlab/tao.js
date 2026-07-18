// React setup for Jest (CJS — loaded via setupFilesAfterEnv)
const React = require('react');
const { act } = require('react-dom/test-utils');

global.React = React;

if (React.unstable_batchedUpdates) {
  global.unstable_batchedUpdates = React.unstable_batchedUpdates;
}

global.act = act;

const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
