const Enzyme = require('enzyme');
const Adapter = require('enzyme-adapter-react-16');
const matchers = require('./matchers');

Enzyme.configure({ adapter: new Adapter() });

require('jest-enzyme');

expect.extend(matchers());
