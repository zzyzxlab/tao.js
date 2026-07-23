/**
 * @tao.js/core — the TAO signal network.
 *
 * Applications are built as handlers attached to trigram-named Application
 * Contexts (Term / Action / Orient). Setting an {@link AppCtx} on a
 * {@link Kernel} (or the shared default `TAO`) runs matching handlers in
 * three phases — `INTERCEPT`, `ASYNC`, `INLINE` — and handlers chain by
 * returning another AppCtx. {@link Network} is the lower-level wiring
 * surface (`enter()` + `decorate()`) for adapters; see ENVELOPE-SPEC.md.
 *
 * @module @tao.js/core
 */
import AppCtx from './AppCtx';
import Network from './Network';
import Kernel from './Kernel';
export { INTERCEPT, ASYNC, INLINE, ERROR } from './constants';

/** The shared default Kernel instance. */
const TAO = new Kernel();
export default TAO;
export { AppCtx, Network, Kernel };
