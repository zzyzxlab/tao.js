import get from 'get-value';

export function routeTag(strings, ...keys) {
  return (...values) => {
    const vals = values[0];
    const route = [strings[0]];
    keys.forEach((key, i) => {
      const data = get(vals, key, { default: '' });
      route.push(data, strings[i + 1]);
    });
    return route.join('');
  };
}
