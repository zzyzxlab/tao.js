# Typed Trigram Vocabularies — Design Spec (@tao.js/typed)

Status: draft (branch `feat/typescript-wrapper`, off `feat/chain-transport`).
Companion to `ENVELOPE-SPEC.md` (signal plane), `VISION.md` §3 (the
meta-framework thesis this executes), `AGENTIC.md` (the "typed trigram
vocabularies" checklist item this closes).

## 1. Motivation

TAO's string-keyed dispatch has one failure mode that disproportionately
hurts both agents and humans: **a typo'd trigram is a silent no-op, not an
error**. The paradigm's whole bet is that the app's vocabulary is its
protocol; today that vocabulary lives in strings the compiler cannot see.

The wrapper makes the vocabulary a **type**: each trigram becomes a typed
signal constructor whose datagram type is captured with it — the `tao` and
`data` parameters of the JS contract fused into one typed value. Mistyped
trigrams and mis-shaped datagrams become compile errors. The JS engine
underneath is unchanged: the wrapper _translates_ typed messages into
trigram signals, never reimplements dispatch.

Non-goals: no new runtime semantics (phases, chaining, envelope untouched);
no TS requirement for JS consumers (pure additive package); no codegen step
(types are declared, not generated — the protocol extractor may later emit
a vocabulary skeleton).

## 2. The shape

```ts
import { defineVocabulary, signal } from '@tao.js/typed';

// The app's protocol as a value — TAO.md as code
const App = defineVocabulary({
  UserFind: signal('User', 'Find', 'Portal').data<{ User: { id: string } }>(),
  UserView: signal('User', 'View', 'Portal').data<{ User: UserRecord }>(),
  UserFail: signal('User', 'Fail', 'Portal').data<{
    User: { reason: string };
  }>(),
});

// A typed signal IS the trigram + datagram, one value
const s = App.UserFind({ User: { id: '42' } });
s.t;
s.a;
s.o; // literal types 'User' / 'Find' / 'Portal'
s.data.User.id; // string — datagram type captured per trigram

// Typed kernel facade over any existing Kernel
const tao = typedKernel(TAO, App);

tao.set(App.UserFind({ User: { id: '42' } })); // = setCtx underneath

tao.onInline(App.UserFind, (s) => {
  //  s.data is { User: { id: string } } — no casts
  return App.UserView({ User: load(s.data.User.id) }); // typed chaining
});

tao.onIntercept(App.UserFind, (s) => {
  if (!authorized(s)) return App.UserFail({ User: { reason: 'denied' } });
});
```

Key decisions the shape encodes:

1. **Signal constructors, not string keys.** `App.UserFind(data)` produces
   `{ t, a, o, data }` with literal trigram types. Referencing a signal that
   doesn't exist is a compile error — the silent-no-op failure mode is gone
   at authoring time.
2. **The vocabulary is a plain value.** `defineVocabulary` does no
   registration and touches no kernel; it is importable by any module,
   serializable to `TAO.md`, and diffable in review. One vocabulary can be
   shared by client and server (the protocol artifact, typed).
3. **Handlers receive the typed signal**, not `(tao, data)` — the fusion
   Jeff described. The wrapper adapts to the JS `(tao, data)` handler
   underneath; handler returns may be any signal from the vocabulary
   (typed chaining) or void.
4. **Phase-explicit registration** (`onIntercept`/`onAsync`/`onInline`)
   mirrors the JS contract; returns a dispose function (typed wrapper owns
   the handler-fn identity mapping so removal works).

## 3. Wildcards, typed

Wildcard subscription is a _projection of the vocabulary_, not a stringly
escape hatch:

```ts
tao.onInline(App.match({ t: 'User' }), (s) => {
  // s: UserFind | UserView | UserFail — discriminated union on (a)
  switch (s.a) {
    case 'Find':
      s.data.User.id;
      break; // narrowed
    case 'View':
      s.data.User;
      break;
  }
});
tao.onInline(App.any(), (s) => {
  /* union of the whole vocabulary */
});
```

`match` filters the vocabulary at the type level (template-literal /
conditional types over the declared signals) and registers the equivalent
wildcard trigram underneath. Signals outside the vocabulary (other
libraries, untyped app code on the same kernel) simply don't reach typed
handlers' type space — at runtime they still dispatch per JS semantics;
`onUnvocabularied` (escape hatch, `unknown` data) is available for
observability code.

## 4. Translation layer (runtime)

Tiny and dumb by design: `typedKernel(kernel, vocab)` wraps
`setCtx`/`add*Handler`/`remove*Handler`. `set(signal)` →
`kernel.setCtx({t,a,o}, data)`. `onX(sigOrMatch, h)` →
`kernel.addXHandler(trigram, (tao, data) => h(reify(tao, data)))` where
`reify` rebuilds the typed signal (a plain object; no classes, no
prototypes across boundaries). Chained returns translate back via their own
trigram. Transport/telemetry/envelope: untouched — typed signals are
ordinary signals on the wire and in traces.

Promise surfaces follow: `typedTransponder(transponder, vocab).set(signal)`
resolves with the vocabulary union (or a `resolveOn`-projected subset).

## 5. Files & packaging

- New package `@tao.js/typed` (`packages/tao-typed`), TypeScript source,
  emits ESM+CJS+d.ts; peer on `@tao.js/core >=0.20.0`.
- Tests: type-level tests (`tsd` or `expect-type`) for the vocabulary
  algebra + runtime jest tests for translation fidelity (a typed cascade
  observed by a Tracer is identical to its untyped equivalent).
- JSDoc pass on existing JS packages precedes this (separate commits):
  typedefs for the public surfaces (Kernel, Network envelope/decoration
  shapes, adapters, telemetry records, wire envelope), enabling
  `tsc --allowJs --declaration` d.ts emission for JS consumers and giving
  the wrapper authoritative shapes to align with.

## 6. Open questions (for Jeff)

1. Naming: `@tao.js/typed` vs `@tao.js/ts`? (spec assumes `typed`)
2. Should `defineVocabulary` also emit the runtime list of trigrams for the
   protocol extractor / TAO.md generation (vocab.toProtocol())? (leaning
   yes — it's free and closes the loop with AGENTIC.md)
3. Datagram convention: enforce `{ [Term]: ... }` keying at the type level,
   or leave datagram shapes fully free per signal? (leaning free, with a
   helper for the term-keyed convention)
