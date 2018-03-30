const matchers = require('./matchers');

expect.extend(matchers());

// console.log('new matcher:', expect({}).toEqualOn);
