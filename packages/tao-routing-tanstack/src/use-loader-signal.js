import { useEffect, useRef } from 'react';
import { useLoaderData } from '@tanstack/react-router';
import { useTaoContext } from '@tao.js/react';
import { createUseSignalEffect, getSignal } from '@tao.js/routing-core';

/** @typedef {import('@tao.js/routing-core').RouteSignal} RouteSignal */
/** @typedef {import('@tao.js/routing-core').LoaderResult} LoaderResult */

/**
 * Read the route-entry signal from the current TanStack Router loader data
 * (the {@link LoaderResult} `{ signal }` bag an `importLoader` produced).
 *
 * TanStack's typings require an options argument (`from`/`strict`) for
 * route-registry-aware inference; this hook deliberately reads whatever
 * route is current with the zero-argument runtime call, so the hook is
 * comment-cast loose and the result re-asserted as a {@link LoaderResult}.
 *
 * @returns {RouteSignal | null | undefined}
 */
function useTanStackSignal() {
  /** @type {LoaderResult | null | undefined} */
  const data = /** @type {*} */ (useLoaderData)();
  return getSignal(data);
}

/**
 * Apply the `{ signal }` from the current TanStack Router loader data to the Kernel.
 *
 * @type {import('@tao.js/routing-core').UseSignalEffectHook}
 */
export const useLoaderSignal = createUseSignalEffect({
  useEffect,
  useRef,
  useTaoContext,
  useSignal: useTanStackSignal,
});
