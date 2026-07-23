/**
 * Streams signals to a console-like logger as they occur, indented by causal
 * depth — the live-logging successor to `TaoLogger`'s full-wildcard idiom.
 *
 * @export
 * @class ConsoleSink
 */
export default class ConsoleSink {
  constructor({ logger = console, showData = false, limit = 10000 } = {}) {
    this._logger = logger;
    this._showData = showData;
    this._limit = limit;
    this._depths = new Map();
  }

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
