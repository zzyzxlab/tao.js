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
