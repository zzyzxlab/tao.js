// Polyfills for Jest 27 compatibility
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

// import { shallow, render, mount } from 'enzyme';

// export const setPathname = pathname => {
//   Object.defineProperty(window.location, 'pathname', {
//     writable: true,
//     value: pathname
//   });
// };

// // Skip createElement warnings but fail tests on any other warning
// console.error = message => {
//   if (!/(React.createElement: type should not be null)/.test(message)) {
//     throw new Error(message);
//   }
// };

// // Make Enzyme functions available in all test files without importing
// global.shallow = shallow;
// global.render = render;
// global.mount = mount;

// const localStorageMock = (function() {
//   let store = {};
//   return {
//     getItem(key) {
//       return store[key];
//     },
//     setItem(key, value) {
//       store[key] = value.toString();
//     },
//     clear() {
//       store = {};
//     }
//   };
// })();
// Object.defineProperty(window, 'localStorage', { value: localStorageMock });
