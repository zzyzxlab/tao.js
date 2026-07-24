/**
 * The typed signal algebra (TYPED-SPEC.md §2).
 *
 * A SignalSpec is a declared protocol message: a literal trigram plus the
 * datagram type captured with it. A TypedSignal is one concrete message —
 * the `tao` and `data` parameters of the JS handler contract fused into a
 * single typed value.
 */

/** One concrete protocol message: literal trigram + typed datagram. */
export interface TypedSignal<
  T extends string = string,
  A extends string = string,
  O extends string = string,
  D = unknown,
> {
  readonly t: T;
  readonly a: A;
  readonly o: O;
  readonly data: D;
}

/** A declared protocol message: the trigram with its datagram type. */
export interface SignalSpec<
  T extends string = string,
  A extends string = string,
  O extends string = string,
  D = unknown,
> {
  readonly t: T;
  readonly a: A;
  readonly o: O;
  /** phantom carrier for the datagram type — never a runtime value */
  readonly __data?: D;
}

/** Builder step between `signal(t, a, o)` and `.data<D>()`. */
export interface SignalBuilder<
  T extends string,
  A extends string,
  O extends string,
> {
  /** Capture the datagram type for this trigram. */
  data<D>(): SignalSpec<T, A, O, D>;
}

/**
 * Declare one protocol message: `signal('User', 'Find', 'Portal')
 * .data<{ User: { id: string } }>()`. Runtime cost: one frozen object.
 */
export function signal<
  T extends string,
  A extends string,
  O extends string,
>(t: T, a: A, o: O): SignalBuilder<T, A, O> {
  return {
    data<D>(): SignalSpec<T, A, O, D> {
      return Object.freeze({ t, a, o }) as SignalSpec<T, A, O, D>;
    },
  };
}

/** The `${t}|${a}|${o}` key of a trigram — matches AppCtxRoot.getKey. */
export function keyOf(sig: { t: string; a: string; o: string }): string {
  return `${sig.t}|${sig.a}|${sig.o}`;
}

/**
 * Runtime check that a handler-returned value is a typed signal (vs a
 * boolean intercept verdict, undefined, or app junk).
 */
export function isTypedSignal(value: unknown): value is TypedSignal {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.t === 'string' &&
    typeof v.a === 'string' &&
    typeof v.o === 'string' &&
    'data' in v
  );
}
