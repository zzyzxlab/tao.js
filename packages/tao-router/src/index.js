/**
 * @tao.js/router — the legacy TAO-native URL routing bridge.
 *
 * Connects URL routing with a TAO signal network: a {@link Router} listens
 * for TAO signals (`{Routes,Configure}`, `{Route,Add|Remove|Attach|Detach}`)
 * to build its route table, pushes URLs onto history when route-mapped
 * AppCons fire, and fires AppCons (via `{Route,Match}`) when the URL
 * changes. The {@link route} template tag builds URL paths from data
 * objects.
 *
 * Prefer the host-router adapters (`@tao.js/routing-core` +
 * `@tao.js/routing-react-router` / `-tanstack-router` / `-next`) for new
 * work; this package documents the original TAO-native approach.
 *
 * @module @tao.js/router
 */

/**
 * Shared shapes re-exported for typed consumers (the JSDoc typedefs are the
 * source of truth at their defining modules).
 *
 * @typedef {import('./routeHandler').HistoryLike} HistoryLike
 * @typedef {import('./routeHandler').RouteConfig} RouteConfig
 * @typedef {import('./routeHandler').PathPart} PathPart
 * @typedef {import('./Router').RouterOptions} RouterOptions
 * @typedef {import('./Router').RouteMatch} RouteMatch
 * @typedef {import('./Router').RouteNode} RouteNode
 */
import router from './Router';
import { routeTag as route } from './routeTag';

export { route };

/**
 * Initialize the routing bridge: constructs a `Router` bound to the kernel
 * (see `Router` for the signal protocol). The instance is not returned —
 * it lives through the TAO handlers it registers.
 *
 * @param {ConstructorParameters<typeof router>} args - `(TAO, history?, opts?)`
 *        as the `Router` constructor
 * @returns {void}
 */
export default function init(...args) {
  new router(...args);
}
