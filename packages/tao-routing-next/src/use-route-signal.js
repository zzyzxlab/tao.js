import { useEffect, useRef } from 'react';
import { useTaoContext } from '@tao.js/react';
import { createUseRouteSignal } from '@tao.js/routing-core';

/**
 * Apply an explicit route-entry signal (from server props / page data) to the Kernel.
 *
 * @type {import('@tao.js/routing-core').UseRouteSignalHook}
 */
export const useRouteSignal = createUseRouteSignal({
  useEffect,
  useRef,
  useTaoContext,
});
