# @tao.js/typed

TypeScript-first wrapper for tao.js: **typed trigram vocabularies**. Each
protocol message is a typed signal fusing the trigram and its datagram into
one value; the implementation underneath translates typed messages to the
untyped Kernel and never reimplements dispatch. Design: `TYPED-SPEC.md` at
the repo root.

String-keyed dispatch has one failure mode that hurts most: a typo'd
trigram is a silent no-op. With a vocabulary, referencing an undeclared
signal or mis-shaping a datagram is a **compile error**.

## Usage

```ts
import { Kernel } from '@tao.js/core';
import { signal, defineVocabulary, typedKernel } from '@tao.js/typed';

// The app's protocol as a value — TAO.md as code
const App = defineVocabulary({
  UserFind: signal('User', 'Find', 'Portal').data<{ User: { id: string } }>(),
  UserView: signal('User', 'View', 'Portal').data<{ User: UserRecord }>(),
  UserFail: signal('User', 'Fail', 'Portal').data<{
    User: { reason: string };
  }>(),
});

const tao = typedKernel(new Kernel(), App);

tao.onInline(App.UserFind, (s) => {
  // s.data is { User: { id: string } } — no casts
  return App.UserView({ User: load(s.data.User.id) }); // typed chaining
});

tao.onIntercept(App.UserFind, (s) => {
  if (!authorized(s)) return App.UserFail({ User: { reason: 'denied' } });
});

tao.set(App.UserFind({ User: { id: '42' } }));
```

Typed wildcards are projections of the vocabulary — discriminated unions,
not stringly escape hatches:

```ts
tao.onInline(App.match({ t: 'User' }), (s) => {
  switch (s.a) {
    case 'Find':
      s.data.User.id;
      break; // narrowed per action
    case 'View':
      s.data.User;
      break;
  }
});
tao.onInline(App.any(), (s) => log(s.t, s.a, s.o));
```

## Semantics

- The kernel underneath is unchanged: phases, chaining, envelopes,
  transports, and traces behave identically to untyped signals — a typed
  cascade produces byte-identical trace trees to its untyped equivalent
  (pinned by test).
- Multiple vocabularies (and untyped code) may share one kernel; matcher
  registrations only invoke typed handlers for trigrams their vocabulary
  declares.
- Intercept verdicts pass through: return `true` to halt, a signal to
  divert, nothing to observe.
- Every registration returns a dispose function.
- `App.toProtocol()` returns the declared trigram list — the input for
  `TAO.md` generation and the protocol extractor (`AGENTIC.md`).

## Notes

- Peer: `@tao.js/core >= 0.20`. Ships CJS (`lib`, with `.d.ts`) and ESM
  (`dist`).
- Compile-time behavior is itself tested: `npm run typecheck` includes
  `test-d/` where `@ts-expect-error` assertions pin what must not compile.
