/**
 * Vocabularies (TYPED-SPEC.md §2–§3): the app's protocol as a plain,
 * importable value. `defineVocabulary` turns declared SignalSpecs into
 * typed signal constructors; `match`/`any` project the vocabulary into
 * discriminated unions for wildcard subscription. No kernel is touched —
 * a vocabulary is TAO.md as code.
 */
import {
  SignalSpec,
  TypedSignal,
  keyOf,
} from './signal';

/** Any map of declared protocol messages. */
export type SpecMap = Record<string, SignalSpec<string, string, string, unknown>>;

/** The TypedSignal produced by one SignalSpec. */
export type SignalOf<S> = S extends SignalSpec<infer T, infer A, infer O, infer D>
  ? TypedSignal<T, A, O, D>
  : never;

/** The union of every signal in a vocabulary — the protocol's message type. */
export type VocabularySignals<V extends SpecMap> = {
  [K in keyof V]: SignalOf<V[K]>;
}[keyof V];

/**
 * A signal constructor: call it with the datagram to get the concrete
 * typed signal; its trigram rides along as literal-typed properties.
 */
export type SignalCtor<S extends SignalSpec> = S extends SignalSpec<
  infer T,
  infer A,
  infer O,
  infer D
>
  ? ((data: D) => TypedSignal<T, A, O, D>) & SignalSpec<T, A, O, D>
  : never;

/** A trigram filter over a vocabulary (partial, literal-typed). */
export interface MatchFilter {
  readonly t?: string;
  readonly a?: string;
  readonly o?: string;
}

/**
 * A typed wildcard subscription: carries the projected union as a phantom
 * plus the runtime trigram filter to register underneath.
 */
export interface Matcher<S extends TypedSignal = TypedSignal> {
  readonly __matcher: true;
  readonly filter: MatchFilter;
  /** phantom carrier of the projected signal union */
  readonly __signals?: S;
}

/** Signals of V whose trigram satisfies filter F (type-level projection). */
export type MatchedSignals<
  V extends SpecMap,
  F extends MatchFilter,
> = Extract<
  VocabularySignals<V>,
  (F extends { t: infer T extends string } ? { t: T } : unknown) &
    (F extends { a: infer A extends string } ? { a: A } : unknown) &
    (F extends { o: infer O extends string } ? { o: O } : unknown)
>;

/** The vocabulary meta-surface added alongside the constructors. */
export interface VocabularyMeta<V extends SpecMap> {
  /**
   * Typed wildcard projection: signals matching the partial trigram, as a
   * discriminated union. Registered as the equivalent wildcard underneath.
   */
  match<const F extends MatchFilter>(filter: F): Matcher<MatchedSignals<V, F>>;
  /** The whole vocabulary as one union (full-wildcard subscription). */
  any(): Matcher<VocabularySignals<V>>;
  /** Is this concrete trigram declared in the vocabulary? */
  has(sig: { t: string; a: string; o: string }): boolean;
  /**
   * The declared protocol as data — trigram list for TAO.md generation and
   * the protocol extractor (AGENTIC.md).
   */
  toProtocol(): Array<{ name: string; t: string; a: string; o: string }>;
}

/** What `defineVocabulary` returns: constructors + meta. */
export type Vocabulary<V extends SpecMap> = {
  [K in keyof V]: SignalCtor<V[K]>;
} & VocabularyMeta<V>;

const META_KEYS = ['match', 'any', 'has', 'toProtocol'] as const;

/**
 * Turn declared SignalSpecs into a vocabulary of typed signal
 * constructors. Referencing an undeclared signal is a compile error — the
 * silent-no-op failure mode of string-keyed dispatch is gone at authoring
 * time.
 */
export function defineVocabulary<V extends SpecMap>(specs: V): Vocabulary<V> {
  const keys = new Set<string>();
  const protocol: Array<{ name: string; t: string; a: string; o: string }> =
    [];
  const vocab = {} as Record<string, unknown>;

  for (const [name, spec] of Object.entries(specs)) {
    if ((META_KEYS as readonly string[]).includes(name)) {
      throw new Error(
        `'${name}' is reserved by the vocabulary meta-surface - rename the signal`,
      );
    }
    const key = keyOf(spec);
    if (keys.has(key)) {
      throw new Error(
        `duplicate trigram {${spec.t}, ${spec.a}, ${spec.o}} in vocabulary - one declared signal per trigram`,
      );
    }
    keys.add(key);
    protocol.push({ name, t: spec.t, a: spec.a, o: spec.o });
    const ctor = (data: unknown) =>
      Object.freeze({ t: spec.t, a: spec.a, o: spec.o, data });
    Object.assign(ctor, { t: spec.t, a: spec.a, o: spec.o });
    vocab[name] = ctor;
  }

  const meta: VocabularyMeta<V> = {
    match(filter) {
      return Object.freeze({ __matcher: true as const, filter });
    },
    any() {
      return Object.freeze({ __matcher: true as const, filter: {} });
    },
    has(sig) {
      return keys.has(keyOf(sig));
    },
    toProtocol() {
      return protocol.map((entry) => ({ ...entry }));
    },
  };

  return Object.freeze(Object.assign(vocab, meta)) as Vocabulary<V>;
}

/** Runtime discriminator between a signal constructor and a matcher. */
export function isMatcher(value: unknown): value is Matcher {
  return (
    value != null &&
    typeof value === 'object' &&
    (value as { __matcher?: unknown }).__matcher === true
  );
}
