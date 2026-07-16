// Polyfills for Jest 30 compatibility
const { TextEncoder, TextDecoder } = require('util');

// Add TextEncoder/TextDecoder to global scope
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Add other missing globals that might be needed
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor() {
      // Simple mock implementation
    }
  };
}

if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = class WritableStream {
    constructor() {
      // Simple mock implementation
    }
  };
}

// Add MessagePort polyfill
if (typeof global.MessagePort === 'undefined') {
  global.MessagePort = class MessagePort {
    constructor() {
      // Simple mock implementation
    }
    postMessage() {}
    start() {}
    close() {}
  };
}

// Add MessageChannel polyfill
if (typeof global.MessageChannel === 'undefined') {
  global.MessageChannel = class MessageChannel {
    constructor() {
      this.port1 = new global.MessagePort();
      this.port2 = new global.MessagePort();
    }
  };
}

const Enzyme = require('enzyme');
const Adapter = require('enzyme-adapter-react-16');
const matchers = require('./matchers');

Enzyme.configure({ adapter: new Adapter() });

require('jest-enzyme');

// Extend expect with custom matchers
expect.extend(matchers());

// Restore Jest 27 API compatibility for Jest 30
const originalExpect = expect;

// Restore old method names and missing methods
global.expect = (received) => {
  const matchers = originalExpect(received);

  // Restore old mock function method names
  if (received && typeof received === 'function' && received._isMockFunction) {
    matchers.toBeCalled = matchers.toHaveBeenCalled;
    matchers.toBeCalledWith = matchers.toHaveBeenCalledWith;
    matchers.toBeCalledTimes = matchers.toHaveBeenCalledTimes;
    matchers.lastCalledWith = matchers.toHaveBeenLastCalledWith;
    matchers.nthCalledWith = matchers.toHaveBeenNthCalledWith;
    matchers.toReturn = matchers.toHaveReturned;
    matchers.toReturnWith = matchers.toHaveReturnedWith;
    matchers.lastReturnedWith = matchers.toHaveLastReturnedWith;
    matchers.nthReturnedWith = matchers.toHaveNthReturnedWith;
  }

  // Handle .not property
  if (matchers.not) {
    const originalNot = matchers.not;
    matchers.not = new Proxy(originalNot, {
      get(target, prop) {
        // Handle old method names for .not
        if (prop === 'toBeCalled') return target.toHaveBeenCalled;
        if (prop === 'toBeCalledWith') return target.toHaveBeenCalledWith;
        if (prop === 'toBeCalledTimes') return target.toHaveBeenCalledTimes;
        if (prop === 'toReturn') return target.toHaveReturned;
        if (prop === 'toReturnWith') return target.toHaveReturnedWith;
        if (prop === 'lastReturnedWith') return target.toHaveLastReturnedWith;
        if (prop === 'nthReturnedWith') return target.toHaveNthReturnedWith;

        return target[prop];
      }
    });
  }

  return matchers;
};

// Restore missing expect methods
global.expect.objectContaining = originalExpect.objectContaining;
global.expect.arrayContaining = originalExpect.arrayContaining;
global.expect.stringContaining = originalExpect.stringContaining;
global.expect.stringMatching = originalExpect.stringMatching;
global.expect.assertions = originalExpect.assertions;
global.expect.hasAssertions = originalExpect.hasAssertions;
global.expect.any = originalExpect.any;
global.expect.anything = originalExpect.anything;
