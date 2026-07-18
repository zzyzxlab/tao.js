import { useEffect, useRef } from 'react';
import { useLoaderData } from '@tanstack/react-router';
import { useTaoContext } from '@tao.js/react';
import { createUseSignalEffect, getSignal } from '@tao.js/routing-core';

function useTanStackSignal() {
  const data = useLoaderData();
  return getSignal(data);
}

/**
 * Apply the `{ signal }` from the current TanStack Router loader data to the Kernel.
 */
export const useLoaderSignal = createUseSignalEffect({
  useEffect,
  useRef,
  useTaoContext,
  useSignal: useTanStackSignal,
});
