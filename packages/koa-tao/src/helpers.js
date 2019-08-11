export const noop = () => {};

export function normalizeAC({ t, term, a, action, o, orient }) {
  return {
    term: term || t,
    action: action || a,
    orient: orient || o
  };
}

export const cleanInput = ({ term, action, orient }) => {
  const incoming = { term, action, orient };
  Object.keys(incoming).forEach(k => incoming[k] == null && delete incoming[k]);
  return incoming;
};
