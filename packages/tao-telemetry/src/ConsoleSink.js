/** @typedef {import('./Tracer').TraceRecord} TraceRecord */

/**
 * Streams signals to a console-like logger as they occur, indented by causal
 * depth — the live-logging successor to `TaoLogger`'s full-wildcard idiom.
 *
 * @export
 * @class ConsoleSink
 */
export default class ConsoleSink {
  /**
   * Creates an instance of ConsoleSink.
   * @param {Object} [opts]
   * @param {{ info: function }} [opts.logger=console] - console-like target
   * @param {boolean} [opts.showData=false] - also log each record's captured
   *        data on a second line
   * @param {number} [opts.limit=10000] - cap on the signalId → depth map used
   *        for indentation (FIFO eviction; a child of an evicted parent logs
   *        at root depth)
   * @memberof ConsoleSink
   */
  constructor({ logger = console, showData = false, limit = 10000 } = {}) {
    this._logger = logger;
    this._showData = showData;
    this._limit = limit;
    this._depths = new Map();
  }

  /**
   * Sink interface: log one signal as it occurs, indented beneath its cause
   * (with its producing phase when present).
   *
   * @param {TraceRecord} record
   * @memberof ConsoleSink
   */
  signal(record) {
    const depth =
      record.parentId && this._depths.has(record.parentId)
        ? this._depths.get(record.parentId) + 1
        : 0;
    if (this._depths.size >= this._limit) {
      this._depths.delete(this._depths.keys().next().value);
    }
    this._depths.set(record.signalId, depth);
    const indent = '  '.repeat(depth);
    const link = depth > 0 ? '↳ ' : '';
    const via = record.via ? ` ·${record.via}` : '';
    this._logger.info(
      `${indent}${link}☯{${record.t}, ${record.a}, ${record.o}}${via}`,
    );
    if (this._showData && typeof record.data !== 'undefined') {
      this._logger.info(`${indent}  `, record.data);
    }
  }
}
