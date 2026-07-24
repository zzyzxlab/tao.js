/**
 * @tao.js/typed — typed trigram vocabularies for tao.js (TYPED-SPEC.md).
 *
 * Declare the app's protocol as typed signal constructors
 * (`defineVocabulary` + `signal`), then wrap any Kernel in a typed facade
 * (`typedKernel`). Mistyped trigrams and mis-shaped datagrams become
 * compile errors; the JS engine underneath is unchanged.
 */
export { signal, keyOf, isTypedSignal } from './signal';
export type { TypedSignal, SignalSpec, SignalBuilder } from './signal';
export { defineVocabulary, isMatcher } from './vocabulary';
export type {
  Vocabulary,
  VocabularyMeta,
  VocabularySignals,
  SignalCtor,
  SignalOf,
  Matcher,
  MatchFilter,
  MatchedSignals,
  SpecMap,
} from './vocabulary';
export { typedKernel } from './kernel';
export type {
  TypedKernel,
  TypedHandler,
  TypedHandlerResult,
  UntypedKernel,
  Dispose,
} from './kernel';
