import { AppCtx } from '@tao.js/core';

export default function trigramFilter(...trigrams) {
  if (!trigrams.length || trigrams[0] == null) {
    return ac => ac instanceof AppCtx;
  }
  let exact = false;
  if (typeof trigrams[0] === 'boolean') {
    exact = trigrams[0];
    trigrams.shift();
  }
  return ac => {
    if (!(ac instanceof AppCtx)) {
      return false;
    }
    return trigrams.some(trigram => ac.isMatch(trigram, exact));
  };
}
