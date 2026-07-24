/**
 * Compile-time assertions for the vocabulary algebra (checked by
 * `npm run typecheck`; nothing here runs). The @ts-expect-error lines ARE
 * the tests: if the type system stops rejecting them, typecheck fails.
 */
import { signal, defineVocabulary, typedKernel } from '../src';
import type { UntypedKernel } from '../src';

declare const kernel: UntypedKernel;

const App = defineVocabulary({
  UserFind: signal('User', 'Find', 'Portal').data<{ User: { id: string } }>(),
  UserView: signal('User', 'View', 'Portal').data<{ User: { name: string } }>(),
  SpaceEnter: signal('Space', 'Enter', 'Portal').data<{ Space: { id: string } }>(),
});

const tao = typedKernel(kernel, App);

// trigram literals survive
const s = App.UserFind({ User: { id: '1' } });
const t: 'User' = s.t;
const a: 'Find' = s.a;
const id: string = s.data.User.id;
void t; void a; void id;

// @ts-expect-error — undeclared signal names do not exist
App.UserDelete({ User: { id: '1' } });

// @ts-expect-error — datagram shape is enforced per trigram
App.UserFind({ User: { id: 42 } });

// @ts-expect-error — cross-signal datagrams do not interchange
App.UserFind({ User: { name: 'x' } });

// handlers receive the exact datagram type
tao.onInline(App.UserFind, (sig) => {
  const ok: string = sig.data.User.id;
  void ok;
  // @ts-expect-error — UserFind's datagram has no name
  sig.data.User.name;
});

// typed chaining accepts vocabulary signals
tao.onInline(App.UserFind, () => App.UserView({ User: { name: 'n' } }));

// match projects a discriminated union narrowed by the action
tao.onInline(App.match({ t: 'User' }), (sig) => {
  if (sig.a === 'Find') {
    const ok: string = sig.data.User.id;
    void ok;
  }
  if (sig.a === 'View') {
    const ok: string = sig.data.User.name;
    void ok;
  }
  // @ts-expect-error — Space signals are excluded from a t:'User' projection
  const never: 'Space' = sig.t;
  void never;
});

// any() is the whole protocol union
tao.onInline(App.any(), (sig) => {
  const tri: 'User' | 'Space' = sig.t;
  void tri;
});

// set() only accepts vocabulary signals
tao.set(App.SpaceEnter({ Space: { id: 's' } }));
// @ts-expect-error — raw objects are not vocabulary signals
tao.set({ t: 'User', a: 'Find', o: 'Portal', data: {} });
