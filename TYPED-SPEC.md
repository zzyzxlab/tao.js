# Typed Trigram Vocabularies — Design Spec (@tao.js/typed)

Status: **v1 implemented, superseded in direction by §7 (v2)** — the v1
surface (§2–§4, `defineVocabulary`/`signal().data<D>()`) is built, tested
(100% coverage, trace-identity proof), and working, but the design
conversation recorded in §7 replaces it as the front door. A new session
should implement §7; the v1 translation layer, toolchain, and invariant
tests carry over. Companion to `ENVELOPE-SPEC.md` (signal plane),
`VISION.md` §3 (the meta-framework thesis this executes), `AGENTIC.md`
(the "typed trigram vocabularies" checklist item this closes).

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

---

## 7. v2 direction — transparent DX (design conversation record, 2026-07-23/24)

The v1 surface makes the wrapper _visible_: you know you are wrapping
signal and handler generation. The design goal that replaces it (author's
framing): **the DX should read as strongly-typed `@tao.js/core`** — same
method names, quotes deleted, trigrams _inferred_ from the types.

### 7.1 The erasure split (what's possible without tooling)

TypeScript types are erased; **classes are values**. That splits the ideal
syntax into:

- `tao.setCtx(user, find, portal)` — **works with vanilla tsc**: the
  arguments are instances, `user.constructor.name` supplies the runtime
  trigram while inference supplies the types. Explicit-generic and
  inferred forms are equivalent for free.
- `tao.addInlineHandler<User, Find, Portal>(fn)` — **impossible without a
  transform** (type arguments are erased; nothing at runtime names the
  trigram). The value-carrying form is the vanilla equivalent and is
  _better_ (zero annotations, full inference):
  `tao.addInlineHandler(User, Find, Portal, (user, find, portal) => …)`.

### 7.2 Part carriers (the core contract)

A **part carrier** is anything supplying a runtime name + a datagram type
for one trigram position. Two implementations, one contract:

1. **Classes (front door)** — `class User extends Part<User> { id!: number }`.
   The `Part<Self>` base solves the four class problems in ~4 lines each:
   - _nominality_: a `private declare` brand — TS is structurally typed,
     so without it a plain literal `{id: 1}` typechecks where `User` is
     expected but has `constructor.name === 'Object'` at runtime (the
     compile-passes/runtime-explodes trap);
   - _construction_: `constructor(data: Fields<Self>)` gives
     `new User({ id: 1 })` without per-class boilerplate;
   - _minification_: optional `static tao = 'User'` override
     (name resolution: `static tao ?? class name`; runtime throws loudly
     on `'Object'`); document `keep_classnames`;
   - _wire rehydration_: received JSON re-attaches the registered class's
     prototype, so methods on parts work in handlers — including for
     signals that crossed a transport.
2. **Factories (escape hatch)** — `const User = part('User').data<{id: number}>()`,
   the zod/valibot idiom: name appears once, no `new`, minification-proof,
   nominal by construction. More idiomatic TS, less transparent.

Datagram mapping revives the **original AppCtx three-datum convention**
(`data[t]`, `data[a]`, `data[o]` — one datum per position), so typed and
untyped code interoperate byte-for-byte on one kernel. Dataless positions
accept the class itself (`tao.setCtx(user, Find, Portal)`).

### 7.3 Open mode vs protocol mode

Transparent calls permit any combination of declared parts (wrong-position
triples typecheck). Two modes:

- **open** (default): any triple; datagram shapes still enforced.
- **protocol**: `typedTAO(kernel, { protocol: [[User, Find, Portal], …] as const })`
  — undeclared trigram = compile error, restoring v1's closed-vocabulary
  guarantee with transparent call sites. `tao.protocol()` emits the triple
  list for TAO.md/extractor. Subsumes v1's `defineVocabulary`.

### 7.4 Ergonomics tiers (proposed implementation order)

| tier | mechanism                                                       | pipeline cost                                  | notes                                     |
| ---- | --------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| 0    | value-carrying API (`addInlineHandler(User, Find, Portal, fn)`) | none                                           | canonical contract everything lowers to   |
| 1a   | **decorators**                                                  | none (stage-3 native in tsc/esbuild/swc/babel) | build FIRST — biggest ergonomics per cost |
| 1b   | type-arg transform (`<User, Find, Portal>` sugar)               | opt-in plugin                                  | see 7.6                                   |
| 2    | TAO.md path DSL                                                 | runtime loader; build plugin optional          | see 7.7                                   |

### 7.5 Decorators (tier 1a)

```ts
class UserHandlers {
  constructor(private repo: UserRepo) {} // DI-friendly

  @(onInline(User, Find, Portal).chain(Found)) // declared output edge
  find(user: User, find: Find) {
    return new Found({ user: this.repo.find(find.by) }); // just the new part
  }

  @(onInline(User, Find, Portal).chains(Found, NotFound)) // branching:
  findOrFail(user: User, find: Find) {
    // return TYPE picks
    const hit = this.repo.find(find.by); // the edge
    return hit ? new Found({ user: hit }) : new NotFound({ query: find.by });
  }
}
const dispose = tao.attach(new UserHandlers(repo)); // group lifecycle
```

Decorator factories take **values** (no erasure problem, no build tooling);
`context.addInitializer` collects registrations per instance for
`attach`/`dispose` group lifecycle (per-request Channels, per-connection
sockets). The decorator type constrains the method signature against the
declared parts. `.chain()/.chains()` declared outputs make chain edges
**statically extractable** (closing part of AGENTIC.md's
emergent-control-flow friction); guardrails: (a) one mode per handler —
declared outputs XOR dynamic `chain(t, a, o)` returns (the formalized
explicit constructor); (b) carried-position semantics fixed at
`transferToAppCtx` copy rules, never configurable. Support stage-3
decorators first; legacy `experimentalDecorators` detectable by argument
shape if Nest/Angular demand it.

### 7.6 The type-arg transform (tier 1b)

Universal _because constrained to a syntactic rewrite_: type arguments must
be identifiers of value-imported part carriers in scope (no aliases,
`typeof`, mapped types — diagnostics otherwise; `import type` is a
diagnostic since it erases the value). Then every toolchain can host it:
one core transform wrapped by **`@tao.js/unplugin`** (Vite/Rollup/webpack/
esbuild/rspack), **`@tao.js/babel-plugin`** (babel/Metro/jest), and a
ts-patch transformer (raw tsc). swc-native pipelines (default Next.js)
need a wasm plugin eventually or their babel fallback. Editor needs no
plugin (the sugar overload typechecks standalone); forgetting the plugin
fails loudly (the untransformed overload's runtime throws a setup error).
The sugar lowers into tier 0.

### 7.7 `@tao.js/path` revival (tier 2)

Author's original vision: chains declared in one place, forwarding
handlers auto-wired. Fenced ```tao blocks in TAO.md itself:

    {User, Find, Portal}   => {User, Found, Portal}    # inline forward
    {User, Found, Portal}  ~> {Analytics, Track, App}  # async forward
    {User, Delete, Portal} !> {Auth, Check, Portal}    # intercept

Runtime loader parses fences at boot and wires via the existing
`forward-chain` helpers; the build plugin (same unplugin infra as 7.6)
validates every trigram against the typed protocol at compile time. The
DSL stays for _pure_ forwards (transferToAppCtx copy semantics) — logic
stays in code or in decorator `.chain()` transforms; the two are the same
primitive in two syntaxes. TAO.md becomes simultaneously docs, declared
protocol, chain topology, and (via the tracer) verifiable against
observed behavior.

### 7.8 What carries over from v1 / resolved questions

- Carries over: the dumb-translation-layer philosophy (dispatch untouched),
  the typed-cascade-traces-identically invariant test, the toolchain
  (`typescript@^5.9` pin — bare `typescript` resolves to the native TS7
  compiler with no JS API, breaking ts-jest; ts-jest self-contained jest
  config — the shared babel preset's transform proved unreliable for .ts),
  and the JSDoc typedef pass (independent of surface, already committed).
- Resolved: classes are acceptable _with_ the `Part<T>` base (nominality +
  construction are the price of transparency; factories remain for teams
  that refuse classes); `chain(t, a, o)` is the one explicit dynamic
  escape hatch; typed handlers inherit the 0.20 async-phase contract
  unchanged (calls scheduled on the event loop, called-before-inline).
- Open for the author: package name (`typed` vs `ts`); enforce term-keyed
  datagrams at the type level or leave free (leaning free + helper);
  protocol mode as the _recommended_ default in docs (leaning yes) or
  quick-start-first; decorator legacy-flavor support priority.
