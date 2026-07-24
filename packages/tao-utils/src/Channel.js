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
 * @export
 * @class Channel
 */
export default class Channel {
  /**
   *Creates an instance of Channel.
   * @param {Kernel} kernel - an instance of a Kernel or other TAO Network on which to build a Channel by sharing the same underlying Network
   * @param {(string|function)} [id] - pass either a desired Channel ID value as a `string` or a `function` that will be used to generate a Channel ID
   *        the `function` will be called with a new Channel ID integer value to help ensure uniqueness
   * @param {boolean} [debug=false] - pass true to console.log internal activity
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
   * @param {(string|function)} [cloneId] - used as the cloned `Channel`'s ID,
   *          same as the `id` param to the `Channel` constructor, either an
   *          explicit value as a `string` or a `function` used to generate the Channel ID
   * @returns
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
   * @memberof Channel
   */
  enter(ac, { cascade = {}, hop = {}, chain = null } = {}) {
    this._network.enter(ac, {
      cascade: { ...cascade, ...channelControl(this._channelId) },
      hop,
      chain,
    });
  }

  setCtx({ t, term, a, action, o, orient }, data) {
    this.enter(new AppCtx(term || t, action || a, orient || o, data));
  }

  setAppCtx(ac) {
    this.enter(ac);
  }

  /**
   * Register a decoration on the Channel's private network — observes the
   * AppCons mirrored to this Channel (used by wrapping adapters like
   * Transponder). Same contract as `Network.decorate`.
   *
   * @returns {function} dispose - removes the decoration
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

  addInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  addAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addAsyncHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  addInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.addInlineHandler({ t, term, a, action, o, orient }, handler);
    return this;
  }

  removeInterceptHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInterceptHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  removeAsyncHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeAsyncHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

  removeInlineHandler({ t, term, a, action, o, orient }, handler) {
    this._channel.removeInlineHandler(
      { t, term, a, action, o, orient },
      handler,
    );
    return this;
  }

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
