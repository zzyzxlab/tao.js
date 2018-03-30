const diff = require('jest-diff');

const getMatchers = () => ({
  toEqualOn(received, expected, ...props) {
    let failedAt = '';
    let pass = false;
    let checkProps = props;
    if (!checkProps.length) {
      // use the expected object itself for props to check
      checkProps = Object.keys(expected);
    } else if (props.length === 1) {
      // first arg is an array
      if (props[0] instanceof Array) {
        checkProps = props[0];
      } else if (props[0] instanceof Object) {
        checkProps = Object.keys(props[0]).filter(p => p);
      }
    }
    // if (this.isNot) {
    //   pass = checkProps.some(p => {
    //     failedAt = p;
    //     return this.equal(received[p], expected[p]);
    //   });
    // }
    // else {
    pass = checkProps.every(p => {
      failedAt = p;
      return this.equals(received[p], expected[p]);
    });
    // }
    const message = pass
      ? () =>
          this.utils.matcherHint('.not.toEqualOn') +
          '\n\n' +
          `Expected prop '${failedAt}' to not equal (using expect.toEqual):\n` +
          `  ${this.utils.printExpected(expected[failedAt])}\n` +
          `Received:\n` +
          `  ${this.utils.printReceived(received[failedAt])}`
      : () => {
          const diffString = diff(expected, received, { expand: this.expand });
          return (
            this.utils.matcherHint('.toEqualOn') +
            '\n\n' +
            `Expected prop '${failedAt}' to equal (using expect.toEqual):\n` +
            `  ${this.utils.printExpected(expected[failedAt])}\n` +
            `Received:\n` +
            `  ${this.utils.printReceived(received[failedAt])}` +
            (diffString ? `\n\nDifference:\n\n${diffString}` : '')
          );
        };

    return { actual: received, pass, message };
  }
});

module.exports = getMatchers;
