/*
 * Type-level assertion helpers. `AssertFalse<IsAny<T>>` fails to compile
 * when T is `any` — the degradation mode skipLibCheck can otherwise hide
 * (e.g. a declaration whose cross-package import silently failed to
 * resolve).
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;
export type AssertFalse<T extends false> = T;
