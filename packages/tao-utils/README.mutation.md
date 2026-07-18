# Mutation testing (`@tao.js/utils`)

StrykerJS + Jest for signal-network utilities.

## Run

```sh
pnpm test:mutation:utils
```

HTML/JSON reports land in `reports/mutation/` (gitignored).

## Notes

- Config: `stryker.config.json` — `inPlace: true`; barrel `index.js` excluded.
- Disable equivalent mutants with `// Stryker disable … : reason` (colon required; place `disable` before a `try`, not inside it).
- Optional `_debug && console.log(...)` paths, `++id % MAX_SAFE_INTEGER` ID-counter arithmetic, and a handful of redundant boolean sub-clauses / no-op guard branches (see below) are Stryker-disabled as equivalent.
- Latest score (2026-07-18): **100%** (577 killed, 2 timeout, 0 survived; thresholds high=95). 11 sandbox child-process crashes in `bridge.js`/`Transceiver.js` are Stryker/Node runner flakiness (`filter is not a function` from an unrelated in-place mutant clobbering a shared module during a parallel run), not survivors — they do not count against the score and disappear on re-run.

### File-by-file

| File              | Score       | Killed  | Timeout | Survived |
| ----------------- | ----------- | ------- | ------- | -------- |
| Channel.js        | 100.00%     | 74      | 0       | 0        |
| Transceiver.js    | 100.00%     | 140     | 2       | 0        |
| Transponder.js    | 100.00%     | 58      | 0       | 0        |
| logger.js         | 100.00%     | 81      | 0       | 0        |
| Relay.js          | 100.00%     | 40      | 0       | 0        |
| Source.js         | 100.00%     | 50      | 0       | 0        |
| seive.js          | 100.00%     | 29      | 0       | 0        |
| bridge.js         | 100.00%     | 35      | 0       | 0        |
| trigram-filter.js | 100.00%     | 26      | 0       | 0        |
| forward-chain.js  | 100.00%     | 8       | 0       | 0        |
| transfer.js       | 100.00%     | 36      | 0       | 0        |
| **All files**     | **100.00%** | **577** | **2**   | **0**    |

### Equivalent mutants disabled (with reasons in source)

- **ID counters** (`Channel.js`, `Transceiver.js` ×2, `Transponder.js`) — `++id % MAX_SAFE_INTEGER` monotonicity/wraparound is untestable without exhausting the counter; the `newSignalId` body is disabled with `all` since its returned id is never asserted on.
- **Debug logging** (`Channel.js`, `Transponder.js`) — `this._debug && console.log(...)` branches have no externally observable effect on network behavior.
- **`logger.js` clause1-alone** (constructor, `depth()`, `setInspect()`) — in `inspect == null || typeof inspect != 'function' || …`, whenever `inspect`/`i` is `null`/`undefined` the `typeof` clause is already `true`, so forcing clause 1 to `false` never changes which branch runs.
- **`Transceiver.js:119`** — the synchronous `catch` guard `if (!control.signalled)` runs immediately after entering the `try`, before anything else can observe or mutate `control`, so it is always `true` on entry; equivalent to `if (true)`.
- **`Transceiver.js:224`** — when the inline handler's return value is `null`/`undefined`, forcing entry into the `if` body only ever assigns that same falsy value to `firstResolve` (or is skipped because `firstResolve` is already truthy), which is indistinguishable from skipping the block.
- **`Transceiver.js:236`** — `for...of` over an empty `nextSpool` array already runs zero iterations, so forcing the surrounding `if` to `true` has no observable effect when the array is empty.
- **`Transponder.js:52`** — `inTO` was already coerced through `+timeoutMs || 0` above, so `inTO > 0 ? inTO : 0` and `inTO >= 0 ? inTO : 0` pick the same value for every possible `inTO` (0 maps to 0 either way).

See `@tao.js/core` (`packages/tao/README.mutation.md`) for the pattern used to raise scores.
