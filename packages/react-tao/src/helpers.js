import cartesian from 'cartesian';

export const noop = () => {};

export function normalizeAC({ t, term, a, action, o, orient }) {
  return {
    term: term || t,
    action: action || a,
    orient: orient || o
  };
}

export function cleanInput({ term, action, orient }) {
  const incoming = { term, action, orient };
  Object.keys(incoming).forEach(k => incoming[k] == null && delete incoming[k]);
  return incoming;
}

export function normalizeClean({ t, term, a, action, o, orient }) {
  return cleanInput(normalizeAC({ t, term, a, action, o, orient }));
}

export function getPermutations({ t, term, a, action, o, orient }) {
  const trigram = normalizeClean({ t, term, a, action, o, orient });
  const permutations = cartesian(trigram);
  if (permutations.length) {
    return permutations;
  }
  return [{}];
}

function trigramHash(trigram) {
  return !trigram ? '%' : Array.isArray(trigram) ? trigram.join(',') : trigram;
}

export function handlerHash({ term, action, orient }) {
  return `${trigramHash(term)}|${trigramHash(action)}|${trigramHash(orient)}`;
}
