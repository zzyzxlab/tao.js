/**
 * Ambient declaration for the Node/bundler `process.env.NODE_ENV` guard in
 * deprecations.js. Checking-only: tsc does not re-emit input .d.ts files,
 * so this never lands in lib/. (@types/node is deliberately not installed —
 * the runtime guard is `typeof process !== 'undefined'`.)
 */
declare var process:
  | { env: { NODE_ENV?: string; [name: string]: string | undefined } }
  | undefined;
