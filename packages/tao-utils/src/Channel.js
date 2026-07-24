import { AppCtx, Network } from '@tao.js/core';
import seive from './seive';

// for backwards compatibility
const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

let channelId = 0;
function newChannelId() {
  // Stryker disable next-line ArithmeticOperator,UpdateOperator: counter monotonicity/modulo wraparound at MAX_SAFE_INTEGER is untestable without exhausting the counter
  return (channelId = ++channelId % MAX_SAFE_INTEGER);
}

function channelControl(channelId) {
  return { channelId };
}

/**
 * A trigram matcher in short (`t`/`a`/`o`) or long (`term`/`action`/`orient`)
 * keys; omitted parts are wildcards.
 *
 * @typedef {Object} Trigram
 * @property {string} [t] - term (short key)
 * @property {string} [term] - term (long key)
 * @property {string} [a] - action (short key)
 * @property {string} [action] - action (long key)
 * @property {string} [o] - orient (short key)
 * @property {string} [orient] - orient (long key)
 */

/**
 * A TAO signal handler: called with the concrete trigram handled and the
 * signal's datagram(s); returning an `AppCtx` chains it (see `@tao.js/core`).
 *
 * @callback SignalHandler
 * @param {Object} tao - the concrete `{ t, a, o }` trigram handled
 * @param {*} data - the signal's datagram(s)
 * @returns {(AppCtx|*)}
 */

/**
 * Filters handling of AppCons to the set of attached handlers of the Channel for only those
 * AppCons that had a preceding AppCon originate from this Channel.
 *
 * Implemented as a Network decoration (see ENVELOPE-SPEC.md): the Channel
 * enters signals with a `{ channelId }` cascade and mirrors chained AppCons
 * of matching cascades onto its private network, where channel-attached
 * handlers run. Core owns dispatch everywhere: AppCons chained from
 * channel-attached handlers continue the cascade envelope through the main
 * network's hop engine (they do not re-enter with a fresh envelope).
 *
 * Decoration: `onForward` on the shared network, self-filtered on
 * `envelope.cascade.channelId`. The channel tag rides the cascade scope —
 * one shared reference for the whole cascade — so every descendant hop of a
 * channel entry is mirrored, wherever the chain goes.
 *
 * @export
 * @class Channel
 */
export default class Channel {
  /**
   *Creates an instance of Channel.
   *
   * Surface resolution follows the utils convention
   * (`typeof kernel.enter === 'function' ? kernel : kernel._network`): pass
   * anything exposing the envelope gate directly (a `Network`), or a
   * Kernel-shaped wrapper exposing `_network`. The resolved network must
   * support `enter` and `decorate`.
   *
   * @param {(Kernel|Network)} kernel - an instance of a Kernel or other TAO Network on which to build a Channel by sharing the same underlying Network
   * @param {(string|function(number): (string|number))} [id] - pass either a desired Channel ID value as a `string` or a `function` that will be used to generate a Channel ID
   *        the `function` will be called with a new Channel ID integer value to help ensure uniqueness
   * @param {boolean} [debug=false] - pass true to console.log internal activity
   * @throws {Error} when the resolved network lacks envelope support
   *         (`enter` + `decorate`) - upgrade `@tao.js/core`
   * @memberof Channel
   */
  constructor(kernel, id, debug = false) {
    this._debug = debug;
    this._channelId =
      typeof id === 'function' ? id(newChannelId()) : id || newChannelId();
    this._channel = new Network();
    this._network =
      typeof kernel.enter === 'function' ? kernel : kernel._network;
    if (
      !this._network ||
      typeof this._network.enter !== 'function' ||
      typeof this._network.decorate !== 'function'
    ) {
      throw new Error(
        'Channel requires a @tao.js/core version with envelope support - upgrade @tao.js/core',
      );
    }
    this._cloneWithId = typeof id === 'function' ? id : undefined;
    this._undecorate = this._network.decorate({
      // Stryker disable next-line StringLiteral: decoration name is a diagnostic label with no observable behavior
      name: `channel:${this._channelId}`,
      onForward: (nextAc, envelope, meta) => {
        this._mirror(nextAc, envelope, meta);
      },
    });
  }

  /**
   * Clones a Channel
   *
   * The clone shares the same underlying network, copies the private
   * network's handler registrations, and registers its own decoration under
   * its own Channel ID.
   *
   * @param {(string|function(number): (string|number))} [cloneId] - used as the cloned `Channel`'s ID,
   *          same as the `id` param to the `Channel` constructor, either an
   *          explicit value as a `string` or a `function` used to generate the Channel ID;
   *          falls back to the constructor's `id` generator when one was given
   * @returns {Channel} the cloned Channel
   * @memberof Channel
   */
  clone(cloneId) {
    const clone = new Channel(
      { _network: this._network },
      cloneId || this._cloneWithId,
    );
    clone._channel = this._channel.clone();
    return clone;
  }

  /**
   * Detach this Channel's decoration from the shared network. Channel
   * handlers stop receiving mirrored AppCons; entries still dispatch.
   *
   * @returns {void}
   * @memberof Channel
   */
  dispose() {
    this._undecorate();
  }

  /**
   * Entry gate with this Channel's scoping: enters the shared network with
   * the channel's `{ channelId }` merged into the cascade. Wrapping adapters
   * (e.g. Transponder) use this to add their own cascade tags while keeping
   * channel affinity.
   *
   * @param {AppCtx} ac
   * @param {Object} [opts] - `{ cascade, hop, chain }` as `Network.enter`
   * @param {Object} [opts.cascade] - caller cascade keys; the channel tag
   *        wins key conflicts
   * @param {Object} [opts.hop] - entry-hop values (e.g. a transport's
   *        `source` marker)
   * @param {(Object|null)} [opts.chain] - prior chain state to continue
   * @returns {void}
   * @memberof Channel
   */
  enter(ac, { cascade = {}, hop = {}, chain = null } = {}) {
    this._network.enter(ac, {
      cascade: { ...cascade, ...channelControl(this._channelId) },
      hop,
      chain,
    });
  }

  /**
   * Builds an AppCtx from a trigram + datagram (long-form keys win) and
   * enters it with this Channel's cascade scoping.
   *
   * @param {Trigram} trigram
   * @param {*} data - datagram(s) for the signal
   * @returns {void}
   * @memberof Channel
   */
  setCtx({ t, term, a, action, o, orient }, data) {
    this.enter(new AppCtx(term || t, action || a, orient || o, data));
  }

  /**
   * Enters an existing AppCtx with this Channel's cascade scoping.
   *
   * @param {AppCtx} ac
   * @returns {void}
   * @memberof Channel
   */
  setAppCtx(ac) {
    this.enter(ac);
  }

  /**
   * Register a decoration on the Channel's private network — observes the
   * AppCons mirrored to this Channel (used by wrapping adapters like
   * Transponder). Same contract as `Network.decorate`.
   *
   * @param {Object} spec - decoration spec as `Network.decorate` accepts
   *        (`{ name, onDispatch, onForward, onReturn, onProceed, chain }`)
   * @returns {function(): void} dispose - removes the decoration
   * @memberof Channel
   */
  decorate(spec) {
    return this._channel.decorate(spec);
  }

  _mirror(ac, envelope, meta) {
    if (envelope.cascade.channelId === this._channelId) {
      // Stryker disable all: optional debug logging
      this._debug &&
        console.log(
          `channel{${this._channelId}}::mirroring::ac:`,
          ac.unwrapCtx(),
        );
      // Stryker restore all
      // same-hop dispatch: the observed envelope travels verbatim (hop.via,
      // chain intact) and chains from channel-attached handlers continue
      // the cascade envelope through the main network's hop engine
      // (ENVELOPE-SPEC.md §4, §12)
      this._channel.mirror(ac, envelope, meta.forward);
    }
  }

  /**
   * Attaches an InterceptHandler to this Channel's private network — runs
   * for matching AppCons mirrored to this Channel.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {Channel} this
   * @memberof Channel
   */
  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  /**
   * Attaches an AsyncHandler to this Channel's private network — runs for
   * matching AppCons mirrored to this Channel.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {Channel} this
   * @memberof Channel
   */
  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addAsyncHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  /**
   * Attaches an InlineHandler to this Channel's private network — runs for
   * matching AppCons mirrored to this Channel.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {Channel} this
   * @memberof Channel
   */
  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInlineHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  /**
   * Removes an InterceptHandler previously attached for the same trigram.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {Channel} this
   * @memberof Channel
   */
  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  /**
   * Removes an AsyncHandler previously attached for the same trigram.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {Channel} this
   * @memberof Channel
   */
  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  /**
   * Removes an InlineHandler previously attached for the same trigram.
   *
   * @param {Trigram} trigram
   * @param {SignalHandler} handler
   * @returns {Channel} this
   * @memberof Channel
   */
  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  /**
   * Bridges matching AppCons flowing on another Kernel's network into this
   * Channel (via `seive`), excluding cascades that already originated from
   * this Channel (no echo).
   *
   * @param {Kernel} TAO - Kernel-shaped wrapper (exposing `_network`) to bridge from
   * @param {...*} trigrams - optional trigram filters as `trigramFilter`
   *        accepts (optional leading `exact` boolean, then short-key
   *        trigrams or a single array of trigrams); none bridges every AppCon
   * @returns {function(): void} dispose - detaches the bridge
   * @memberof Channel
   */
  bridgeFrom(TAO, ...trigrams) {
    return seive(
      this._channelId,
      TAO,
      this,
      (ac, control) => control.channelId !== this._channelId,
      ...trigrams,
    );
  }
}
