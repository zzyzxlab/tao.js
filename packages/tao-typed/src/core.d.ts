/**
 * Minimal ambient types for @tao.js/core, scoped to what this package
 * consumes. Temporary: replaced by declaration emission from the JSDoc'd
 * JS sources once that lands (see TYPED-SPEC.md §5).
 */
declare module '@tao.js/core' {
  export class AppCtx {
    constructor(t: string, a: string, o: string, ...datum: unknown[]);
    readonly t: string;
    readonly a: string;
    readonly o: string;
    readonly key: string;
    readonly data: Record<string, unknown>;
    readonly isWildcard: boolean;
    unwrapCtx(verbose?: boolean): { t: string; a: string; o: string };
  }
}
