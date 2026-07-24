import { useEffect, useRef } from 'react';
import { useLoaderData } from 'react-router';
import { useTaoContext } from '@tao.js/react';
import { createUseSignalEffect, getSignal } from '@tao.js/routing-core';

/** @typedef {import('@tao.js/routing-core').RouteSignal} RouteSignal */
/** @typedef {import('@tao.js/routing-core').LoaderResult} LoaderResult */

/**
 * Read the route-entry signal from the current React Router loader data
 * (the {@link LoaderResult} `{ signal }` bag an `importLoader` produced).
 *
 * @returns {RouteSignal | null | undefined}
 */
function useReactRouterSignal() {
  const data = useLoaderData();
  return getSignal(data);
}

/**
 * Apply the `{ signal }` from the current React Router loader data to the Kernel.
 *
 * @type {import('@tao.js/routing-core').UseSignalEffectHook}
 */
export const useLoaderSignal = createUseSignalEffect({
  useEffect,
  useRef,
  useTaoContext,
  useSignal: useReactRouterSignal,
});
