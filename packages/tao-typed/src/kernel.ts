/**
 * The translation layer (TYPED-SPEC.md §4): a typed facade over an
 * existing Kernel. Deliberately dumb — adapts typed signals to
 * `setCtx`/`add*Handler` and never reimplements dispatch, so phases,
 * chaining, envelopes, transports, and tracing behave identically to
 * untyped signals on the same kernel.
 */
import { AppCtx } from '@tao.js/core';
import { SignalSpec, TypedSignal, isTypedSignal } from './signal';
import {
  Matcher,
  MatchFilter,
  SignalCtor,
  SpecMap,
  Vocabulary,
  VocabularySignals,
  isMatcher,
} from './vocabulary';

/** The untyped kernel surface the facade adapts to (structural). */
export interface UntypedKernel {
  setCtx(
    trigram: { t: string; a: string; o: string },
    data?: unknown,
  ): void;
  addInterceptHandler(trigram: object, handler: UntypedHandler): unknown;
  addAsyncHandler(trigram: object, handler: UntypedHandler): unknown;
  addInlineHandler(trigram: object, handler: UntypedHandler): unknown;
  removeInterceptHandler(trigram: object, handler: UntypedHandler): unknown;
  removeAsyncHandler(trigram: object, handler: UntypedHandler): unknown;
  removeInlineHandler(trigram: object, handler: UntypedHandler): unknown;
}

type UntypedHandler = (
  tao: { t: string; a: string; o: string },
  data: unknown,
) => unknown;

/**
 * What a typed handler may return: nothing, a chained signal (any typed
 * signal — cross-vocabulary chaining is legal, it is all one network), or
 * for intercept handlers a truthy verdict to halt.
 */
export type TypedHandlerResult =
  | void
  | undefined
  | null
  | boolean
  | TypedSignal
  | Promise<void | undefined | null | boolean | TypedSignal>;

/** A typed handler: receives the fused signal, not `(tao, data)`. */
export type TypedHandler<S extends TypedSignal> = (
  signal: S,
) => TypedHandlerResult;

/** Either a single declared signal or a matcher projection. */
type Subscribable<V extends SpecMap> =
  | SignalCtor<SignalSpec>
  | Matcher<VocabularySignals<V>>;

/** Dispose function returned by every registration. */
export type Dispose = () => void;

/** The typed kernel facade. */
export interface TypedKernel<V extends SpecMap> {
  /** Signal a typed message (translates to `kernel.setCtx`). */
  set(signal: VocabularySignals<V>): void;
  /** Register an intercept handler for one signal or a projection. */
  onIntercept<T extends string, A extends string, O extends string, D>(
    target: SignalSpec<T, A, O, D>,
    handler: TypedHandler<TypedSignal<T, A, O, D>>,
  ): Dispose;
  onIntercept<M extends TypedSignal>(
    target: Matcher<M>,
    handler: TypedHandler<M>,
  ): Dispose;
  /** Register an async handler for one signal or a projection. */
  onAsync<T extends string, A extends string, O extends string, D>(
    target: SignalSpec<T, A, O, D>,
    handler: TypedHandler<TypedSignal<T, A, O, D>>,
  ): Dispose;
  onAsync<M extends TypedSignal>(
    target: Matcher<M>,
    handler: TypedHandler<M>,
  ): Dispose;
  /** Register an inline handler for one signal or a projection. */
  onInline<T extends string, A extends string, O extends string, D>(
    target: SignalSpec<T, A, O, D>,
    handler: TypedHandler<TypedSignal<T, A, O, D>>,
  ): Dispose;
  onInline<M extends TypedSignal>(
    target: Matcher<M>,
    handler: TypedHandler<M>,
  ): Dispose;
  /** The wrapped kernel — escape hatch to the untyped world. */
  readonly kernel: UntypedKernel;
  /** The vocabulary this facade types against. */
  readonly vocabulary: Vocabulary<V>;
}

type Phase = 'Intercept' | 'Async' | 'Inline';

function toTrigram(target: { t?: string; a?: string; o?: string }): {
  t?: string;
  a?: string;
  o?: string;
} {
  const trigram: { t?: string; a?: string; o?: string } = {};
  if (target.t) trigram.t = target.t;
  if (target.a) trigram.a = target.a;
  if (target.o) trigram.o = target.o;
  return trigram;
}

/**
 * Adapt a typed handler to the `(tao, data)` contract.
 *
 * - The fused signal is reified from the dispatch arguments.
 * - Matcher registrations only invoke the typed handler for trigrams the
 *   vocabulary declares (out-of-vocabulary signals on the same kernel
 *   never reach the typed handler's type space); exact registrations are
 *   declared trigrams by construction.
 * - A returned typed signal is translated to an AppCtx so chaining works
 *   exactly as the JS contract defines; all other returns pass through
 *   untouched (intercept truthy-halt verdicts included).
 */
function adapt<V extends SpecMap>(
  vocab: Vocabulary<V>,
  handler: TypedHandler<TypedSignal>,
  vocabOnly: boolean,
): UntypedHandler {
  return (tao, data) => {
    if (vocabOnly && !vocab.has(tao)) {
      return undefined;
    }
    const result = handler({ t: tao.t, a: tao.a, o: tao.o, data });
    return translateResult(result);
  };
}

function translateResult(result: TypedHandlerResult): unknown {
  if (result != null && typeof (result as Promise<unknown>).then === 'function') {
    return (result as Promise<unknown>).then((settled) =>
      translateResult(settled as TypedHandlerResult),
    );
  }
  if (isTypedSignal(result)) {
    return new AppCtx(result.t, result.a, result.o, result.data);
  }
  return result;
}

/**
 * Wrap an existing Kernel in a typed facade for one vocabulary. Multiple
 * facades (and untyped code) may share the same kernel — it is all one
 * signal network.
 */
export function typedKernel<V extends SpecMap>(
  kernel: UntypedKernel,
  vocabulary: Vocabulary<V>,
): TypedKernel<V> {
  if (
    !kernel ||
    typeof kernel.setCtx !== 'function' ||
    typeof kernel.addInlineHandler !== 'function'
  ) {
    throw new Error('typedKernel requires a @tao.js/core Kernel');
  }
  if (!vocabulary || typeof vocabulary.has !== 'function') {
    throw new Error('typedKernel requires a vocabulary from defineVocabulary');
  }

  const register = (
    phase: Phase,
    target: Subscribable<V> | Matcher<TypedSignal>,
    handler: TypedHandler<TypedSignal>,
  ): Dispose => {
    const matcher = isMatcher(target);
    const trigram = toTrigram(
      matcher ? (target.filter as MatchFilter) : (target as SignalSpec),
    );
    const adapted = adapt(vocabulary, handler, matcher);
    (
      kernel[`add${phase}Handler` as const] as (
        trigram: object,
        handler: UntypedHandler,
      ) => unknown
    )(trigram, adapted);
    return () => {
      (
        kernel[`remove${phase}Handler` as const] as (
          trigram: object,
          handler: UntypedHandler,
        ) => unknown
      )(trigram, adapted);
    };
  };

  return {
    kernel,
    vocabulary,
    set(signal) {
      kernel.setCtx({ t: signal.t, a: signal.a, o: signal.o }, signal.data);
    },
    onIntercept(target: Subscribable<V>, handler: TypedHandler<TypedSignal>) {
      return register('Intercept', target, handler);
    },
    onAsync(target: Subscribable<V>, handler: TypedHandler<TypedSignal>) {
      return register('Async', target, handler);
    },
    onInline(target: Subscribable<V>, handler: TypedHandler<TypedSignal>) {
      return register('Inline', target, handler);
    },
  } as TypedKernel<V>;
}
