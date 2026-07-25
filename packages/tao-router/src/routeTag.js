import get from 'get-value';

/**
 * Template-literal tag compiling a URL template into a route-building
 * function. Each interpolation is a `get-value` lookup path resolved
 * against the data object the returned function is called with; missing
 * values render as `''`.
 *
 * ```js
 * const userRoute = route`/users/${'user.id'}`;
 * userRoute({ user: { id: 7 } }); // => '/users/7'
 * ```
 *
 * @param {TemplateStringsArray} strings - the template's literal parts
 * @param {...string} keys - `get-value` lookup paths (the interpolations)
 * @returns {function(Object=): string} builds the route path from a data
 *          object
 */
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
