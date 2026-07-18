# Mutation testing (`@tao.js/koa`)

## Run

```sh
pnpm test:mutation:koa
```

Reports in `reports/mutation/` (gitignored). Use `// Stryker disable … : reason` for equivalents.

## Score

Raised from **65.15%** (129 killed / 69 survived / 2 errors) to **100%** (203 killed, 0 survived, 0 errors,
8 ignored static mutants) across all 4 mutated files (`enhanced-middleware.js`, `helpers.js`,
`simple-middleware.js`, `tao-http-middleware.js`). Threshold in `stryker.config.json` is `high: 95`.

| File                     | Score       | Killed  | Survived | Errors |
| ------------------------ | ----------- | ------- | -------- | ------ |
| `enhanced-middleware.js` | 100.00%     | 36      | 0        | 0      |
| `helpers.js`             | 100.00%     | 19      | 0        | 0      |
| `simple-middleware.js`   | 100.00%     | 29      | 0        | 0      |
| `tao-http-middleware.js` | 100.00%     | 119     | 0        | 0      |
| **All files**            | **100.00%** | **203** | **0**    | **0**  |

## Key techniques

- Mocks for `@tao.js/utils` (`Channel`, `Transponder`, `Transceiver`) are imported directly in the
  test file so `Transponder.mock.calls[i][2]` / `Transceiver.mock.calls[i][2]` can assert the exact
  timeout value passed through `opt.timeout || DEFAULT_TIMEOUT`, distinguishing it from `&&`/boolean
  mutants that only surface in constructor call args, never in return values.
- The shared `mockTransponderSetCtx` inner jest.fn captures the exact `(tao, data)` arguments passed
  into `transponder.setCtx(...)`, independent of its (fixed) mocked resolved value. This lets tests
  assert precisely which body/json/`opt.json`-configured field `getBodyData` actually picked, killing
  `&&`/`||` and `if(true)`/`if(false)` mutants in the body-source fallback chain that are otherwise
  invisible because `ctx.body` only reflects the canned mock return value.
- `channel.name(...)` (namer closures for `simpleMiddleware`) are invoked directly in assertions to
  verify `opt.name || DEFAULT_*_NAME` fallback strings, since the mock only stores the namer
  function/string, not its result.
- `getBodyData`'s cascading `if (!data && ...)` guards make many falsy-vs-falsy scenarios equivalent
  (any JS falsy value short-circuits the next guard the same way `null` would), so naive tests testing
  "missing field" are dead ends unless a distinguishing case is engineered: for
  `if (bodyProp && ctx.request[bodyProp])`, a genuinely falsy `bodyProp` (e.g. `opt.json = ''`)
  combined with a _truthy_ value at that key on the request is required to make the `true`/`||`
  mutants diverge from real behavior (both entry paths are otherwise "falsy vs falsy", which cascades
  to the same fallback outcome either way).
- Response-trigram ref-counting (`addResponseHandler`/`removeResponseHandler` in
  `tao-http-middleware.js`) needed a multi-step scenario — add twice, remove twice, checking the
  `GET /responses` output after each remove — to distinguish `has()`-guarded count resets, the
  increment/decrement `AssignmentOperator` mutant (`+=1` vs `-=1`), and full method-body removal, none
  of which are visible from a single add/remove pair.
- Two `BlockStatement` mutants (removing the `extra path parameters` and `context` wrong-method guards)
  originally surfaced as Stryker `RuntimeError`s that crashed the Jest child process: with the guard
  removed, control fell through to `handleContext` for a request with no body/json/configured field,
  and `getBodyData` resolving to `null` crashed on `const { tao, data } = await getBodyData(...)`
  (unguarded destructure of `null`). Fixed with a real source hardening
  (`(await getBodyData(ctx, bodyProp)) || {}`) rather than a test workaround — this was a latent
  production bug (any body-less `POST /tao/context` could crash the process), not just a mutant
  artifact. After the fix, the same test scenarios kill the mutants as ordinary assertion failures.
