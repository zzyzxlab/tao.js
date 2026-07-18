import get from 'get-value';

export function routeTag(strings, ...keys) {
  return (...values) => {
    const vals = values[0];
    const route = [strings[0]];
    keys.forEach((key, i) => {
      // Stryker disable next-line ObjectLiteral: equivalent - route.join('') below converts a missing/undefined value to '' exactly like the { default: '' } option would, so both produce the same final string
      const data = get(vals, key, { default: '' });
      route.push(data, strings[i + 1]);
    });
    return route.join('');
  };
}
